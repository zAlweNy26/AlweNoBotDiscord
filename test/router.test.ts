import { type APIInteraction, InteractionResponseType, InteractionType, type REST } from "discord.js"
import { describe, expect, it } from "vitest"
import { ephemeralError } from "../src/respond"
import { routeInteraction } from "../src/router"

const context = {
  env: { OWNER_ID: "1" } as unknown as Env,
  rest: {} as REST,
  waitUntil: () => {},
}

describe("routeInteraction", () => {
  it("answers PING with PONG", async () => {
    const response = await routeInteraction({ type: InteractionType.Ping } as APIInteraction, context)
    expect(response).toEqual({ type: InteractionResponseType.Pong })
  })

  it("rejects unknown commands with an ephemeral error", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      data: { name: "nope" },
      user: { id: "123" },
    } as unknown as APIInteraction
    const response = await routeInteraction(interaction, context)
    expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })

  it("rejects unsupported interaction types", async () => {
    const interaction = { type: InteractionType.ModalSubmit } as unknown as APIInteraction
    const response = await routeInteraction(interaction, context)
    expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })
  it("lets the owner run an owner-only command from a guild", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      data: { name: "stats" },
      member: { user: { id: "1" } },
    } as unknown as APIInteraction
    const response = await routeInteraction(interaction, {
      ...context,
      rest: { get: async () => [] } as unknown as REST,
    })
    expect(response).not.toEqual(ephemeralError("Questo comando è riservato al proprietario del bot."))
    expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })

  it("rejects a non-owner running an owner-only command from a guild", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      data: { name: "stats" },
      member: { user: { id: "999" } },
    } as unknown as APIInteraction
    const response = await routeInteraction(interaction, context)
    expect(response).toEqual(ephemeralError("Questo comando è riservato al proprietario del bot."))
  })
})
