import { SlashCommandBuilder } from "discord.js"
import { fetchJson } from "../lib/http"
import { ERROR_COLOR, SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getStringOption } from "./options"
import type { Command } from "./types"

interface CoinGeckoMarket {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number | null
  high_24h: number
  low_24h: number
}

function formatEuro(value: number | null) {
  if (value === null) return "n/d"
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value)
}

export const cryptoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Mostra il prezzo di una criptomoneta")
    .addStringOption((option) =>
      option.setName("id").setDescription("ID della criptomoneta (es. bitcoin)").setRequired(true),
    ),
  category: "Misc",
  execute: (context) =>
    runDeferred(context, async () => {
      const id = (getStringOption(context.interaction, "id") ?? "").toLowerCase()

      let coins: CoinGeckoMarket[]
      try {
        coins = await fetchJson<CoinGeckoMarket[]>(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${encodeURIComponent(id)}`,
        )
      } catch {
        return {
          embeds: [
            {
              color: ERROR_COLOR,
              description: "Servizio momentaneamente non disponibile, riprova più tardi.",
            },
          ],
        }
      }

      const coin = Array.isArray(coins) ? coins[0] : undefined
      if (!coin) {
        return {
          embeds: [{ color: ERROR_COLOR, description: `La criptomoneta **${id}** non esiste.` }],
        }
      }

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            author: { name: `${coin.name} (${coin.symbol.toUpperCase()})` },
            thumbnail: { url: coin.image },
            fields: [
              { name: "Prezzo", value: formatEuro(coin.current_price), inline: true },
              {
                name: "Variazione 24h",
                value: formatEuro(coin.price_change_percentage_24h),
                inline: true,
              },
              { name: "Massimo 24h", value: formatEuro(coin.high_24h), inline: true },
              { name: "Minimo 24h", value: formatEuro(coin.low_24h), inline: true },
            ],
          },
        ],
      }
    }),
}
