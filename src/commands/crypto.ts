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

function formatEuro(value: number | null, locale: string) {
  if (value === null) return "N/A"
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value)
}

export const cryptoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Show the price of a cryptocurrency")
    .addStringOption((option) =>
      option.setName("id").setDescription("Cryptocurrency ID (e.g. bitcoin)").setRequired(true),
    ),
  category: "Misc",
  execute: (context) =>
    runDeferred(context, async () => {
      const { t, locale } = context
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
              description: t(($) => $.commands.crypto.serviceUnavailable),
            },
          ],
        }
      }

      const coin = Array.isArray(coins) ? coins[0] : undefined
      if (!coin) {
        return {
          embeds: [{ color: ERROR_COLOR, description: t(($) => $.commands.crypto.notFound, { id }) }],
        }
      }

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            author: { name: `${coin.name} (${coin.symbol.toUpperCase()})` },
            thumbnail: { url: coin.image },
            fields: [
              { name: t(($) => $.commands.crypto.price), value: formatEuro(coin.current_price, locale), inline: true },
              {
                name: t(($) => $.commands.crypto.change24h),
                value: formatEuro(coin.price_change_percentage_24h, locale),
                inline: true,
              },
              { name: t(($) => $.commands.crypto.high24h), value: formatEuro(coin.high_24h, locale), inline: true },
              { name: t(($) => $.commands.crypto.low24h), value: formatEuro(coin.low_24h, locale), inline: true },
            ],
          },
        ],
      }
    }),
}
