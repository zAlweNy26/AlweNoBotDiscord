import {
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
  DiscordAPIError,
  InteractionResponseType,
  type REST,
} from "discord.js"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runDeferred } from "../src/commands/deferred"
import { createTranslator } from "../src/lib/i18n"

function apiError(code: number, status: number) {
  return new DiscordAPIError({ message: "boom", code }, code, status, "GET", "https://discord.com/api/v10/x", {
    body: undefined,
    files: undefined,
  })
}

function createContext(locale = "en") {
  const pending: Promise<unknown>[] = []
  const patched: { embeds?: APIEmbed[] }[] = []
  const context = {
    env: { DISCORD_APPLICATION_ID: "app" } as unknown as Env,
    rest: {
      patch: vi.fn(async (_route: string, body: { body: { embeds?: APIEmbed[] } }) => {
        patched.push(body.body)
        return {}
      }),
    } as unknown as REST,
    interaction: { token: "token" } as unknown as APIChatInputApplicationCommandInteraction,
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise)
    },
    t: createTranslator(locale),
    locale,
  }
  return { context, patched, pending }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("runDeferred", () => {
  it("acks immediately", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { context } = createContext()

    const response = runDeferred(context, async () => ({ content: "done" }))

    expect(response.type).toBe(InteractionResponseType.DeferredChannelMessageWithSource)
  })

  it("patches the reply with the mapped message when the work fails with a Discord error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { context, patched, pending } = createContext()

    runDeferred(context, async () => {
      throw apiError(50013, 403)
    })
    await Promise.all(pending)

    expect(patched[0]?.embeds?.[0]?.description).toBe("I don't have the permissions to do that.")
  })

  it("translates the mapped message for the invoker locale", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { context, patched, pending } = createContext("it")

    runDeferred(context, async () => {
      throw apiError(50013, 403)
    })
    await Promise.all(pending)

    expect(patched[0]?.embeds?.[0]?.description).toBe("Non ho i permessi necessari per farlo.")
  })

  it("falls back to the generic message for unknown failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { context, patched, pending } = createContext()

    runDeferred(context, async () => {
      throw new Error("boom")
    })
    await Promise.all(pending)

    expect(patched[0]?.embeds?.[0]?.description).toBe("Something went wrong while running this command.")
  })
})
