import { createExecutionContext, createMessageBatch, env, getQueueResult } from "cloudflare:test"
import { exports } from "cloudflare:workers"
import { type APIChatInputApplicationCommandInteraction, InteractionResponseType, type REST } from "discord.js"
import { describe, expect, it, vi } from "vitest"
import { summaryCommand } from "../src/commands/summary"
import { handleQueueBatch, type QueuedJob } from "../src/index"
import type { ManualSummaryDeps } from "../src/summary"

function createDeps(options: { patchFails?: boolean } = {}): ManualSummaryDeps {
  const rest = {
    get: vi.fn(async () => [
      {
        id: "1",
        content: "hello",
        timestamp: "2026-01-01T10:00:00.000Z",
        author: { id: "1", username: "user" },
      },
    ]),
    patch: vi.fn(async () => {
      if (options.patchFails) {
        throw new Error("patch failed")
      }
      return {}
    }),
  } as unknown as REST
  return { rest, summarize: vi.fn(async () => "riassunto"), applicationId: "app" }
}

function createBatch(body: QueuedJob = { guildId: "guild", channelId: "channel", needed: 10, token: "token" }) {
  return createMessageBatch<QueuedJob>("alwenobot-summary", [
    { id: "message-1", timestamp: new Date(0), attempts: 1, body },
  ])
}

describe("worker", () => {
  it("responds to /health", async () => {
    const response = await exports.default.fetch("https://example.com/health")
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
  })
})

describe("summary manual command", () => {
  it("queues the summary through the configured queue binding", async () => {
    const response = await summaryCommand.execute({
      env,
      rest: {} as unknown as REST,
      interaction: {
        guild_id: "guild",
        channel_id: "channel",
        token: "token",
        data: {
          name: "summary",
          type: 1,
          options: [
            {
              type: 1,
              name: "manual",
              options: [{ type: 4, name: "messages", value: 10 }],
            },
          ],
        },
      } as unknown as APIChatInputApplicationCommandInteraction,
      waitUntil: vi.fn(),
    })

    expect(response.type).toBe(InteractionResponseType.DeferredChannelMessageWithSource)
  })
})

describe("handleQueueBatch", () => {
  it("acks messages that were delivered", async () => {
    const batch = createBatch()
    const ctx = createExecutionContext()

    await handleQueueBatch(batch, createDeps())

    const result = await getQueueResult(batch, ctx)
    expect(result.explicitAcks).toContain("message-1")
    expect(result.retryMessages).toEqual([])
  })

  it("retries messages whose delivery failed", async () => {
    const batch = createBatch()
    const ctx = createExecutionContext()

    await handleQueueBatch(batch, createDeps({ patchFails: true }))

    const result = await getQueueResult(batch, ctx)
    expect(result.retryMessages.map((message: { msgId: string }) => message.msgId)).toEqual(["message-1"])
    expect(result.explicitAcks).toEqual([])
  })

  it("routes activity jobs to the activity worker instead of the summarizer", async () => {
    const patched: { embeds: { title?: string }[] }[] = []
    const rest = {
      get: vi.fn(async () => [
        {
          id: "1",
          content: "ciao",
          timestamp: new Date().toISOString(),
          author: { id: "10", username: "user" },
        },
      ]),
      patch: vi.fn(async (_route: string, body: { body: { embeds: { title?: string }[] } }) => {
        patched.push(body.body)
        return {}
      }),
    } as unknown as REST
    const summarize = vi.fn(async () => "riassunto")
    const batch = createBatch({ kind: "activity", channelId: "channel", token: "token" })
    const ctx = createExecutionContext()

    await handleQueueBatch(batch, { rest, summarize, applicationId: "app" })

    const result = await getQueueResult(batch, ctx)
    expect(result.explicitAcks).toContain("message-1")
    expect(summarize).not.toHaveBeenCalled()
    expect(patched[0]?.embeds[0]?.title).toBe("📊 Utenti più attivi")
  })
})
