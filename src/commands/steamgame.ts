import { type APIEmbedField, SlashCommandBuilder } from "discord.js"
import type { TFunction } from "i18next"
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

function formatPrice(data: NonNullable<AppDetailsEntry["data"]>, t: TFunction, locale: string) {
  if (data.is_free) return t(($) => $.commands.steamgame.free)
  const price = data.price_overview
  if (!price) return t(($) => $.common.notAvailable)
  const value = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency || "EUR",
  }).format(price.final / 100)
  return price.discount_percent > 0 ? `${value} (-${price.discount_percent}%)` : value
}

function formatPlaytime(minutes: number | undefined, t: TFunction) {
  if (!minutes) return t(($) => $.common.notAvailable)
  return t(($) => $.commands.steamgame.hoursPlayed, { hours: Math.round(minutes / 60) })
}

function error(description: string) {
  return { embeds: [{ color: ERROR_COLOR, description }] }
}

export const steamgameCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("steamgame")
    .setDescription("Show information about a Steam game")
    .addStringOption((option) => option.setName("query").setDescription("Game name or appid").setRequired(true)),
  async execute(context) {
    const { t, locale } = context
    const query = getStringOption(context.interaction, "query")?.trim()
    if (!query) {
      return {
        type: 4,
        data: { ...error(t(($) => $.commands.steamgame.missingQuery)), flags: 64 },
      }
    }

    return runDeferred(context, async () => {
      let appid: number | undefined
      if (/^\d+$/.test(query)) {
        appid = Number(query)
      } else {
        appid = (
          await fetchJson<StoreSearchResponse>(
            `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=it`,
          )
        ).items?.[0]?.id
      }
      if (!appid) {
        return error(t(($) => $.commands.steamgame.noGame, { query }))
      }

      const [detailsResponse, players, spy] = await Promise.all([
        fetchJson<AppDetailsResponse>(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=it&l=english`),
        fetchJson<CurrentPlayersResponse>(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
        ).catch(() => null),
        fetchJson<SteamSpyResponse>(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`).catch(() => null),
      ])

      const entry = detailsResponse[String(appid)]
      const data = entry?.success ? entry.data : undefined
      if (!data) {
        return error(t(($) => $.commands.steamgame.noData, { appid }))
      }

      const fields: APIEmbedField[] = []
      fields.push({
        name: t(($) => $.commands.steamgame.type),
        value:
          (
            {
              game: t(($) => $.commands.steamgame.typeGame),
              dlc: t(($) => $.commands.steamgame.typeDlc),
              mod: t(($) => $.commands.steamgame.typeMod),
            } as Record<string, string>
          )[data.type] ?? data.type,
        inline: true,
      })
      fields.push({
        name: t(($) => $.commands.steamgame.minimumAge),
        value: data.required_age > 0 ? `${data.required_age}+` : t(($) => $.commands.steamgame.everyone),
        inline: true,
      })
      fields.push({
        name: t(($) => $.commands.steamgame.price),
        value: formatPrice(data, t, locale),
        inline: true,
      })
      fields.push({
        name: t(($) => $.commands.steamgame.achievements),
        value: data.achievements?.total ? String(data.achievements.total) : t(($) => $.common.none),
        inline: true,
      })
      fields.push({
        name: t(($) => $.commands.steamgame.currentPlayers),
        value: players?.response?.player_count
          ? players.response.player_count.toLocaleString(locale)
          : t(($) => $.common.notAvailable),
        inline: true,
      })
      fields.push({
        name: t(($) => $.commands.steamgame.averagePlaytime),
        value: formatPlaytime(spy?.average_forever, t),
        inline: true,
      })
      fields.push({
        name: t(($) => $.commands.steamgame.developers),
        value: data.developers?.join(", ") || t(($) => $.common.notAvailable),
      })
      fields.push({
        name: t(($) => $.commands.steamgame.publishers),
        value: data.publishers?.join(", ") || t(($) => $.common.notAvailable),
      })
      fields.push({
        name: t(($) => $.commands.steamgame.platforms),
        value:
          [
            data.platforms.windows ? "Windows" : null,
            data.platforms.mac ? "macOS" : null,
            data.platforms.linux ? "Linux" : null,
          ]
            .filter((platform): platform is string => platform !== null)
            .join(", ") || t(($) => $.common.notAvailable),
      })
      fields.push({
        name: t(($) => $.commands.steamgame.releaseDate),
        value: data.release_date?.date ?? t(($) => $.common.notAvailable),
      })

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
