import { type APIEmbedField, SlashCommandBuilder } from "discord.js"
import { fetchJson } from "../lib/http"
import { ERROR_COLOR, SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getStringOption } from "./options"
import type { Command } from "./types"

interface StoreSearchItem {
  id: number
  name: string
}

interface StoreSearchResponse {
  total: number
  items?: StoreSearchItem[]
}

interface AppDetailsEntry {
  success: boolean
  data?: {
    name: string
    type: string
    required_age: number
    is_free: boolean
    header_image: string
    price_overview?: {
      initial: number
      final: number
      discount_percent: number
      currency: string
    }
    achievements?: { total: number }
    release_date?: { date?: string }
    platforms: { windows: boolean; mac: boolean; linux: boolean }
    developers?: string[]
    publishers?: string[]
  }
}

type AppDetailsResponse = Record<string, AppDetailsEntry>

interface CurrentPlayersResponse {
  response?: { player_count?: number }
}

interface SteamSpyResponse {
  average_forever?: number
}

const TYPE_COLORS: Record<string, number> = { game: 0x95e318, dlc: 0xa555b1, mod: 0xe1b21e }

function formatPrice(data: NonNullable<AppDetailsEntry["data"]>) {
  if (data.is_free) return "Gratis"
  const price = data.price_overview
  if (!price) return "n/d"
  const value = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: price.currency || "EUR",
  }).format(price.final / 100)
  return price.discount_percent > 0 ? `${value} (-${price.discount_percent}%)` : value
}

function formatPlaytime(minutes: number | undefined) {
  if (!minutes) return "n/d"
  return `${Math.round(minutes / 60)} ore`
}

function error(description: string) {
  return { embeds: [{ color: ERROR_COLOR, description }] }
}

export const steamgameCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("steamgame")
    .setDescription("Mostra informazioni su un gioco Steam")
    .addStringOption((option) => option.setName("query").setDescription("Nome del gioco o appid").setRequired(true)),
  async execute(context) {
    const query = getStringOption(context.interaction, "query")?.trim()
    if (!query) {
      return {
        type: 4,
        data: { ...error("Specifica il nome di un gioco o un appid."), flags: 64 },
      }
    }

    return runDeferred(context, async () => {
      let appid: number | undefined
      if (/^\d+$/.test(query)) {
        appid = Number(query)
      } else {
        appid = (
          await fetchJson<StoreSearchResponse>(
            `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=italian&cc=it`,
          )
        ).items?.[0]?.id
      }
      if (!appid) {
        return error(`❌ Nessun gioco trovato per **${query}**.`)
      }

      const [detailsResponse, players, spy] = await Promise.all([
        fetchJson<AppDetailsResponse>(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=it&l=italian`),
        fetchJson<CurrentPlayersResponse>(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
        ).catch(() => null),
        fetchJson<SteamSpyResponse>(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`).catch(() => null),
      ])

      const entry = detailsResponse[String(appid)]
      const data = entry?.success ? entry.data : undefined
      if (!data) {
        return error(`❌ Nessun dato disponibile per l'appid **${appid}**.`)
      }

      const fields: APIEmbedField[] = []
      fields.push({
        name: "Tipo",
        value: ({ game: "Gioco", dlc: "DLC", mod: "Mod" } as Record<string, string>)[data.type] ?? data.type,
        inline: true,
      })
      fields.push({
        name: "Età minima",
        value: data.required_age > 0 ? `${data.required_age}+` : "Per tutti",
        inline: true,
      })
      fields.push({ name: "Prezzo", value: formatPrice(data), inline: true })
      fields.push({
        name: "Achievements",
        value: data.achievements?.total ? String(data.achievements.total) : "Nessuno",
        inline: true,
      })
      fields.push({
        name: "Giocatori attuali",
        value: players?.response?.player_count ? players.response.player_count.toLocaleString("it-IT") : "n/d",
        inline: true,
      })
      fields.push({
        name: "Media tempo di gioco",
        value: formatPlaytime(spy?.average_forever),
        inline: true,
      })
      fields.push({
        name: "Sviluppatore/i",
        value: data.developers?.join(", ") || "n/d",
      })
      fields.push({
        name: "Editore/i",
        value: data.publishers?.join(", ") || "n/d",
      })
      fields.push({
        name: "Piattaforme",
        value:
          [
            data.platforms.windows ? "Windows" : null,
            data.platforms.mac ? "macOS" : null,
            data.platforms.linux ? "Linux" : null,
          ]
            .filter((platform): platform is string => platform !== null)
            .join(", ") || "n/d",
      })
      fields.push({ name: "Data di uscita", value: data.release_date?.date ?? "n/d" })

      return {
        embeds: [
          {
            color: TYPE_COLORS[data.type] ?? SUCCESS_COLOR,
            title: data.name,
            url: `https://store.steampowered.com/app/${appid}`,
            thumbnail: { url: data.header_image },
            fields,
          },
        ],
      }
    })
  },
}
