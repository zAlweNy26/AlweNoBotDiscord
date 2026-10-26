import {
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
  ApplicationCommandOptionType,
  type REST,
} from "discord.js"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cryptoCommand } from "../src/commands/crypto"
import { createTranslator } from "../src/lib/i18n"

const BITCOIN = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://example.com/btc.png",
  current_price: 60_000,
  price_change_percentage_24h: -2.345,
  high_24h: 61_000,
  low_24h: 59_000,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("cryptoCommand", () => {
  it("shows the 24h change as a percentage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([BITCOIN])),
    )
    const pending: Promise<unknown>[] = []
    const patched: { embeds?: APIEmbed[] }[] = []
    const patch = vi.fn(async (_route: string, body: { body: { embeds?: APIEmbed[] } }) => {
      patched.push(body.body)
      return {}
    })

    cryptoCommand.execute({
      env: { DISCORD_APPLICATION_ID: "app" } as unknown as Env,
      t: createTranslator("en"),
      locale: "en",
      rest: { patch } as unknown as REST,
      interaction: {
        token: "token",
        data: {
          name: "crypto",
          options: [{ name: "id", type: ApplicationCommandOptionType.String, value: "bitcoin" }],
        },
      } as unknown as APIChatInputApplicationCommandInteraction,
      waitUntil: (promise) => {
        pending.push(promise)
      },
    })
    await Promise.all(pending)

    expect(patched[0]?.embeds?.[0]?.fields?.[1]?.value).toBe("-2.35%")
  })
})
