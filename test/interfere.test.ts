import { type REST, Routes } from "discord.js"
import { describe, expect, it, vi } from "vitest"
import { appendLine, INTERFERE_CONTEXT_LINES, isIgnoreMarker, replyToInterfere } from "../src/interfere"
import type { MentionMessage } from "../src/mention"

function toMessage(content = "che si fa stasera?"): MentionMessage {
  return {
    id: "10",
    channel_id: "20",
    guild_id: "30",
    timestamp: "2026-09-14T21:41:00.000Z",
    content,
    author: { id: "1", username: "user", global_name: null },
    mentions: [],
    attachments: [],
  } as unknown as MentionMessage
}

function createDeps(reply = "Niente, come sempre.", gif: string | null = null) {
  const post = vi.fn(async () => ({}))
  const summarize = vi.fn(async () => reply)
  const searchGif = vi.fn(async () => gif)
  return {
    deps: { rest: { post } as unknown as REST, summarize, searchGif },
    post,
    summarize,
    searchGif,
  }
}

describe("isIgnoreMarker", () => {
  it("recognises the bare marker", () => {
    expect(isIgnoreMarker("{{ignore}}")).toBe(true)
  })

  it("tolerates whitespace and case", () => {
    expect(isIgnoreMarker("  {{IGNORE}}\n")).toBe(true)
  })

  it("ignores a marker buried in an answer", () => {
    expect(isIgnoreMarker("{{ignore}} ma anche no")).toBe(false)
    expect(isIgnoreMarker("Mi sembra una cattiva idea.")).toBe(false)
  })
})

describe("appendLine", () => {
  it("appends the line", () => {
    expect(appendLine(["a"], "b")).toEqual(["a", "b"])
  })

  it("keeps only the last few lines", () => {
    const lines = Array.from({ length: INTERFERE_CONTEXT_LINES }, (_, index) => `riga ${index}`)
    const result = appendLine(lines, "nuova")

    expect(result).toHaveLength(INTERFERE_CONTEXT_LINES)
    expect(result[0]).toBe("riga 1")
    expect(result[result.length - 1]).toBe("nuova")
  })

  it("leaves the original transcript alone", () => {
    const transcript = ["a"]
    appendLine(transcript, "b")

    expect(transcript).toEqual(["a"])
  })
})

describe("replyToInterfere", () => {
  it("posts the answer as a reply to the message", async () => {
    const { deps, post } = createDeps()
    const posted = await replyToInterfere(deps, toMessage(), ["Marco: che si fa stasera?"])

    expect(posted).toBe(true)
    expect(post).toHaveBeenCalledTimes(1)
    const [route, options] = post.mock.calls[0] as unknown as [
      string,
      { body: { content: string; message_reference: { message_id: string } } },
    ]
    expect(route).toBe(Routes.channelMessages("20"))
    expect(options.body.content).toBe("Niente, come sempre.")
    expect(options.body.message_reference.message_id).toBe("10")
  })

  it("shows the model the transcript and the way to stay silent", async () => {
    const { deps, summarize } = createDeps()
    await replyToInterfere(deps, toMessage(), ["Marco: che si fa stasera?", "Luca: niente, come sempre."])

    const [system, user] = summarize.mock.calls[0] as unknown as [string, string]
    expect(system).toContain("not a service")
    expect(user).toContain("Marco: che si fa stasera?")
    expect(user).toContain("Luca: niente, come sempre.")
    expect(user).toContain("{{ignore}}")
    expect(user).toContain("{{gif:")
    expect(user).toMatch(/Angle for this answer: .+\./)
  })

  it("clamps an answer that rambles past the limit", async () => {
    const { deps, post } = createDeps("a ".repeat(1_000))
    const posted = await replyToInterfere(deps, toMessage(), [])

    expect(posted).toBe(true)
    const [, options] = post.mock.calls[0] as unknown as [string, { body: { content: string } }]
    expect(options.body.content.length).toBeLessThanOrEqual(400)
    expect(options.body.content.endsWith("…")).toBe(true)
  })

  it("stays silent when the model chooses to", async () => {
    const { deps, post, searchGif } = createDeps("{{ignore}}")
    const posted = await replyToInterfere(deps, toMessage(), [])

    expect(posted).toBe(false)
    expect(post).not.toHaveBeenCalled()
    expect(searchGif).not.toHaveBeenCalled()
  })

  it("answers with a gif when the model asks for one", async () => {
    const { deps, post, searchGif } = createDeps("{{gif: cane che balla}}", "https://static.klipy.com/ii/abc/cane.gif")
    const posted = await replyToInterfere(deps, toMessage(), [])

    expect(posted).toBe(true)
    expect(searchGif).toHaveBeenCalledWith("cane che balla")
    const [, options] = post.mock.calls[0] as unknown as [string, { body: { content: string } }]
    expect(options.body.content).toBe("https://static.klipy.com/ii/abc/cane.gif")
  })

  it("sends nothing when the gif search finds nothing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { deps, post } = createDeps("{{gif: niente al mondo}}")
      const posted = await replyToInterfere(deps, toMessage(), [])

      expect(posted).toBe(false)
      expect(post).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it("sends nothing when the gif search fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const post = vi.fn(async () => ({}))
      const summarize = vi.fn(async () => "{{gif: cane}}")
      const searchGif = vi.fn(async () => {
        throw new Error("klipy down")
      })
      const posted = await replyToInterfere(
        { rest: { post } as unknown as REST, summarize, searchGif },
        toMessage(),
        [],
      )

      expect(posted).toBe(false)
      expect(post).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it("stays silent when the message carries no words", async () => {
    const { deps, post, summarize } = createDeps()
    const posted = await replyToInterfere(deps, toMessage("🎉 <@10>"), [])

    expect(posted).toBe(false)
    expect(summarize).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })
})
