import { type REST, Routes } from "discord.js"
import { describe, expect, it, vi } from "vitest"
import {
  buildMentionRequest,
  isMentionTrigger,
  type MentionMessage,
  pickRegister,
  replyToMention,
} from "../src/mention"

const BOT_ID = "389455294025039872"

interface FakeMentionedUser {
  id: string
  username: string
  globalName?: string
  nick?: string
}

interface FakeMention {
  content: string
  username?: string
  globalName?: string
  nick?: string
  bot?: boolean
  webhook?: boolean
  mentions?: FakeMentionedUser[]
  referenced?: { username: string; content: string }
  attachments?: Array<{ filename: string; contentType?: string }>
  stickers?: string[]
}

function toMessage(message: FakeMention): MentionMessage {
  return {
    id: "10",
    channel_id: "20",
    guild_id: "30",
    content: message.content,
    author: {
      id: "1",
      username: message.username ?? "user",
      global_name: message.globalName ?? null,
      bot: message.bot,
    },
    ...(message.nick ? { member: { nick: message.nick } } : {}),
    ...(message.webhook ? { webhook_id: "42" } : {}),
    mentions: (message.mentions ?? [{ id: BOT_ID, username: "alwenobot" }]).map((user) => ({
      id: user.id,
      username: user.username,
      global_name: user.globalName ?? null,
      ...(user.nick ? { member: { nick: user.nick } } : {}),
    })),
    attachments: (message.attachments ?? []).map((attachment) => ({
      filename: attachment.filename,
      content_type: attachment.contentType,
    })),
    ...(message.stickers ? { sticker_items: message.stickers.map((name) => ({ name })) } : {}),
    ...(message.referenced
      ? {
          referenced_message: {
            author: { id: "2", username: message.referenced.username, global_name: null },
            content: message.referenced.content,
            attachments: [],
          },
        }
      : {}),
  } as unknown as MentionMessage
}

function createDeps(reply = "Domanda pessima, voto 2.") {
  const post = vi.fn(async () => ({}))
  const summarize = vi.fn(async () => reply)
  return { deps: { rest: { post } as unknown as REST, summarize }, post, summarize }
}

describe("isMentionTrigger", () => {
  it("fires when the bot is tagged", () => {
    expect(isMentionTrigger(toMessage({ content: `<@${BOT_ID}> ciao` }), BOT_ID)).toBe(true)
  })

  it("ignores messages that tag somebody else", () => {
    const message = toMessage({ content: "<@99> ciao", mentions: [{ id: "99", username: "tizio" }] })
    expect(isMentionTrigger(message, BOT_ID)).toBe(false)
  })

  it("ignores other bots", () => {
    expect(isMentionTrigger(toMessage({ content: `<@${BOT_ID}> ciao`, bot: true }), BOT_ID)).toBe(false)
  })

  it("ignores webhooks", () => {
    expect(isMentionTrigger(toMessage({ content: `<@${BOT_ID}> ciao`, webhook: true }), BOT_ID)).toBe(false)
  })
})

describe("buildMentionRequest", () => {
  it("drops the bot tag and keeps the question", () => {
    const message = toMessage({ content: `<@${BOT_ID}> qual è il piano?`, nick: "Marco" })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: qual è il piano?")
  })

  it("accepts the nickname syntax with the exclamation mark", () => {
    const message = toMessage({ content: `<@!${BOT_ID}> qual è il piano?`, nick: "Marco" })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: qual è il piano?")
  })

  it("renders the other mentions as their nicknames", () => {
    const message = toMessage({
      content: `<@${BOT_ID}> chiedi a <@99>`,
      nick: "Marco",
      mentions: [
        { id: BOT_ID, username: "alwenobot" },
        { id: "99", username: "tizio", nick: "Tizio" },
      ],
    })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: chiedi a Tizio")
  })

  it("falls back to the global name when there is no nickname", () => {
    const message = toMessage({ content: `<@${BOT_ID}> ciao`, username: "marco_1994", globalName: "Marco" })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: ciao")
  })

  it("keeps the line clean when the tag carries no words", () => {
    expect(buildMentionRequest(toMessage({ content: `<@${BOT_ID}>`, nick: "Marco" }), BOT_ID)).toBe("Marco:")
  })

  it("turns a tenor link into the words of its slug", () => {
    const message = toMessage({
      content: `<@${BOT_ID}> https://tenor.com/view/cane-che-balla-gif-26401234`,
      nick: "Marco",
    })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: [gif: cane che balla]")
  })

  it("drops the trailing id of a giphy link", () => {
    const message = toMessage({
      content: `<@${BOT_ID}> https://giphy.com/gifs/gatto-offeso-l0HlBO7eyXzSZkJri`,
      nick: "Marco",
    })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: [gif: gatto offeso]")
  })

  it("marks a direct media link that carries no words", () => {
    const message = toMessage({ content: `<@${BOT_ID}> https://media.tenor.com/abc123.gif`, nick: "Marco" })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: [gif]")
  })

  it("leaves links that are not gifs alone", () => {
    const link = "https://youtu.be/dQw4w9WgXcQ"
    const message = toMessage({ content: `<@${BOT_ID}> guarda ${link}`, nick: "Marco" })
    expect(buildMentionRequest(message, BOT_ID)).toBe(`Marco: guarda ${link}`)
  })

  it("marks an uploaded gif sent without a word", () => {
    const message = toMessage({
      content: `<@${BOT_ID}>`,
      nick: "Marco",
      attachments: [{ filename: "reaction.gif", contentType: "image/gif" }],
    })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: [gif]")
  })

  it("tells the other attachments apart", () => {
    const message = toMessage({
      content: `<@${BOT_ID}> ecco`,
      nick: "Marco",
      attachments: [
        { filename: "foto.png", contentType: "image/png" },
        { filename: "clip.mp4", contentType: "video/mp4" },
        { filename: "note.txt", contentType: "text/plain" },
      ],
    })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: ecco [immagine] [video] [file]")
  })

  it("names a sticker", () => {
    const message = toMessage({ content: `<@${BOT_ID}>`, nick: "Marco", stickers: ["gattino"] })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Marco: [sticker: gattino]")
  })

  it("puts the replied message before the tag", () => {
    const message = toMessage({
      content: `<@${BOT_ID}> e questo che vuol dire?`,
      nick: "Marco",
      referenced: { username: "Giulia", content: "domani alle 21" },
    })
    expect(buildMentionRequest(message, BOT_ID)).toBe("Giulia: domani alle 21\nMarco: e questo che vuol dire?")
  })
})

describe("pickRegister", () => {
  it("walks the whole rotation", () => {
    const drawn = new Set(Array.from({ length: 100 }, (_, step) => pickRegister(() => step / 100)))
    expect(drawn.size).toBeGreaterThan(5)
  })

  it("never falls off the end of the list", () => {
    expect(pickRegister(() => 0.999999)).toBeTruthy()
    expect(pickRegister(() => 1)).toBeTruthy()
    expect(pickRegister(() => 0)).toBeTruthy()
  })

  it("keeps the mark out of ten as one option among many", () => {
    const drawn = Array.from({ length: 100 }, (_, step) => pickRegister(() => step / 100))
    const scores = drawn.filter((register) => register.includes("out of ten"))
    expect(scores.length).toBeGreaterThan(0)
    expect(scores.length).toBeLessThan(drawn.length / 4)
  })
})

describe("replyToMention", () => {
  it("posts the answer as a reply to the tag", async () => {
    const { deps, post } = createDeps()
    await replyToMention(deps, toMessage({ content: `<@${BOT_ID}> ciao`, nick: "Marco" }), BOT_ID)

    expect(post).toHaveBeenCalledTimes(1)
    const [route, options] = post.mock.calls[0] as unknown as [
      string,
      { body: { content: string; message_reference: { message_id: string } } },
    ]
    expect(route).toBe(Routes.channelMessages("20"))
    expect(options.body.content).toBe("Domanda pessima, voto 2.")
    expect(options.body.message_reference.message_id).toBe("10")
  })

  it("sends the cleaned text to the model", async () => {
    const { deps, summarize } = createDeps()
    await replyToMention(deps, toMessage({ content: `<@${BOT_ID}> qual è il piano?`, nick: "Marco" }), BOT_ID)

    const [system, user] = summarize.mock.calls[0] as unknown as [string, string]
    expect(system).toContain("tagged you")
    expect(user).toContain("Marco: qual è il piano?")
    expect(user).not.toContain(BOT_ID)
  })

  it("hands the model an angle for the answer", async () => {
    const { deps, summarize } = createDeps()
    await replyToMention(deps, toMessage({ content: `<@${BOT_ID}> ciao` }), BOT_ID)

    const [, user] = summarize.mock.calls[0] as unknown as [string, string]
    expect(user).toMatch(/Angle for this answer: .+\./)
  })

  it("clamps an answer that rambles past the limit", async () => {
    const { deps, post } = createDeps("a ".repeat(1_500))
    await replyToMention(deps, toMessage({ content: `<@${BOT_ID}> ciao` }), BOT_ID)

    const [, options] = post.mock.calls[0] as unknown as [string, { body: { content: string } }]
    expect(options.body.content.length).toBeLessThanOrEqual(800)
    expect(options.body.content.endsWith("…")).toBe(true)
  })
})
