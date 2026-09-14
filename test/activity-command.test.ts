import {
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
  ApplicationCommandOptionType,
  InteractionResponseType,
  type REST,
} from "discord.js"
import { describe, expect, it, vi } from "vitest"
import { type ActivityReportMessage, activityCommand, deliverActivityReport } from "../src/commands/activity"

const DAY_MS = 24 * 60 * 60 * 1000

interface Sent {
  authorId: string
  content?: string
  daysAgo?: number
  bot?: boolean
}

// Newest first with descending ids, the order the Discord message history endpoint returns.
function buildHistory(sent: Sent[]) {
  const now = Date.now()
  return sent.map((entry, index) => ({
    id: String(100_000 - index),
    timestamp: new Date(now - (entry.daysAgo ?? 0) * DAY_MS).toISOString(),
    content: entry.content ?? "ciao",
    author: { id: entry.authorId, username: entry.authorId, bot: entry.bot ?? false },
  }))
}

type History = ReturnType<typeof buildHistory>

function createWorker(history: History) {
  const get = vi.fn(async (_route: string, request: { query: URLSearchParams }) => {
    const limit = Number(request.query.get("limit"))
    const before = request.query.get("before")
    const start = before ? history.findIndex((message) => message.id === before) + 1 : 0
    return history.slice(start, start + limit)
  })
  const patched: { embeds: APIEmbed[] }[] = []
  const patch = vi.fn(async (_route: string, body: { body: { embeds: APIEmbed[] } }) => {
    patched.push(body.body)
    return {}
  })
  return {
    get,
    patch,
    patched,
    deps: { rest: { get, patch } as unknown as REST, applicationId: "app" },
  }
}

const job: ActivityReportMessage = { kind: "activity", channelId: "canale", token: "token" }

function firstEmbed(patched: { embeds: APIEmbed[] }[]) {
  return patched[0]?.embeds[0]
}

function createInteraction(options: unknown[] = []) {
  return {
    guild_id: "guild",
    channel_id: "canale-corrente",
    token: "token",
    data: { name: "activity", options },
  } as unknown as APIChatInputApplicationCommandInteraction
}

function createEnv(send = vi.fn(async () => {})) {
  return { env: { alwenobot_summary: { send } } as unknown as Env, send }
}

describe("activityCommand", () => {
  it("refuses to run outside a server", async () => {
    const { env } = createEnv()
    const interaction = { ...createInteraction(), guild_id: undefined }

    const response = await activityCommand.execute({
      env,
      rest: {} as unknown as REST,
      interaction: interaction as unknown as APIChatInputApplicationCommandInteraction,
      waitUntil: vi.fn(),
    })

    expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })

  it("queues the current channel and defers instead of scanning inline", async () => {
    const { env, send } = createEnv()
    const waitUntil = vi.fn()

    const response = await activityCommand.execute({
      env,
      rest: {} as unknown as REST,
      interaction: createInteraction(),
      waitUntil,
    })

    expect(response.type).toBe(InteractionResponseType.DeferredChannelMessageWithSource)
    expect(send).toHaveBeenCalledWith({
      kind: "activity",
      channelId: "canale-corrente",
      token: "token",
    })
    expect(waitUntil).not.toHaveBeenCalled()
  })

  it("queues the channel passed as an option", async () => {
    const { env, send } = createEnv()

    await activityCommand.execute({
      env,
      rest: {} as unknown as REST,
      interaction: createInteraction([
        { name: "canale", type: ApplicationCommandOptionType.Channel, value: "altro-canale" },
      ]),
      waitUntil: vi.fn(),
    })

    expect(send).toHaveBeenCalledWith({
      kind: "activity",
      channelId: "altro-canale",
      token: "token",
    })
  })

  it("reports an error when the job cannot be queued", async () => {
    const { env } = createEnv(
      vi.fn(async () => {
        throw new Error("queue down")
      }),
    )

    const response = await activityCommand.execute({
      env,
      rest: {} as unknown as REST,
      interaction: createInteraction(),
      waitUntil: vi.fn(),
    })

    expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })
})

describe("deliverActivityReport", () => {
  it("patches the deferred reply with the ranking", async () => {
    const { deps, patched } = createWorker(
      buildHistory([
        { authorId: "10" },
        { authorId: "10" },
        { authorId: "10" },
        { authorId: "20" },
        { authorId: "20" },
        { authorId: "30" },
      ]),
    )

    await deliverActivityReport(deps, job)

    const embed = firstEmbed(patched)
    expect(embed?.description).toContain("🥇 <@10> — **3** messaggi · 50.0%")
    expect(embed?.description).toContain("🥈 <@20> — **2** messaggi · 33.3%")
    expect(embed?.description).toContain("🥉 <@30> — **1** messaggi · 16.7%")
    expect(embed?.fields).toEqual([
      { name: "Canale", value: "<#canale>", inline: true },
      { name: "Messaggi analizzati", value: "6", inline: true },
      { name: "Partecipanti", value: "3", inline: true },
    ])
    expect(embed?.footer?.text).toBe("Ultimi 7 giorni · solo testo, bot esclusi")
  })

  it("stops at the one week boundary", async () => {
    const { deps, patched } = createWorker(
      buildHistory([
        { authorId: "10", daysAgo: 1 },
        { authorId: "10", daysAgo: 6 },
        { authorId: "20", daysAgo: 8 },
        { authorId: "30", daysAgo: 40 },
      ]),
    )

    await deliverActivityReport(deps, job)

    const embed = firstEmbed(patched)
    expect(embed?.description).toContain("<@10>")
    expect(embed?.description).not.toContain("<@20>")
    expect(embed?.fields?.[1]?.value).toBe("2")
  })

  it("keeps paging until it reaches messages older than a week", async () => {
    const recent = Array.from({ length: 250 }, () => ({ authorId: "10", daysAgo: 2 }))
    const { deps, patched, get } = createWorker(buildHistory([...recent, { authorId: "20", daysAgo: 30 }]))

    await deliverActivityReport(deps, job)

    expect(get).toHaveBeenCalledTimes(3)
    expect(get.mock.calls[1]?.[1]?.query.get("before")).toBe("99901")
    expect(firstEmbed(patched)?.fields?.[1]?.value).toBe("250")
  })

  it("keeps going through a flood instead of capping the scan", async () => {
    const flood = Array.from({ length: 5_100 }, () => ({ authorId: "10", daysAgo: 1 }))
    const { deps, patched, get } = createWorker(buildHistory([...flood, { authorId: "20", daysAgo: 30 }]))

    await deliverActivityReport(deps, job)

    expect(get).toHaveBeenCalledTimes(52)
    expect(firstEmbed(patched)?.fields?.[1]?.value).toBe("5100")
  })

  it("skips bots and empty messages", async () => {
    const { deps, patched } = createWorker(
      buildHistory([
        { authorId: "10", content: "vero" },
        { authorId: "99", content: "spam", bot: true },
        { authorId: "20", content: "   " },
      ]),
    )

    await deliverActivityReport(deps, job)

    const embed = firstEmbed(patched)
    expect(embed?.description).toContain("<@10>")
    expect(embed?.description).not.toContain("<@99>")
    expect(embed?.fields?.[1]?.value).toBe("1")
  })

  it("reports a channel with no messages in the last week", async () => {
    const { deps, patched } = createWorker(buildHistory([{ authorId: "10", daysAgo: 9 }]))

    await deliverActivityReport(deps, job)

    expect(firstEmbed(patched)?.description).toContain("Nessun messaggio negli ultimi 7 giorni")
  })

  it("reports a channel it cannot read", async () => {
    const { deps, patched } = createWorker([])
    deps.rest = {
      ...deps.rest,
      get: vi.fn(async () => {
        throw new Error("Missing Access")
      }),
    } as unknown as REST

    await deliverActivityReport(deps, job)

    expect(firstEmbed(patched)?.description).toContain("Non riesco a leggere i messaggi")
  })
})
