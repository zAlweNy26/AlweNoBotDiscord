import { type APIInteraction, DiscordAPIError, InteractionResponseType, InteractionType, type REST } from "discord.js"
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
    expect(response).not.toEqual(ephemeralError("This command is reserved for the bot owner."))
    expect(response.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })

  it("rejects a non-owner running an owner-only command from a guild", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      data: { name: "stats" },
      member: { user: { id: "999" } },
    } as unknown as APIInteraction
    const response = await routeInteraction(interaction, context)
    expect(response).toEqual(ephemeralError("This command is reserved for the bot owner."))
  })

  it("maps Discord permission failures to a readable message", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      data: { name: "server" },
      guild_id: "g",
      user: { id: "123" },
    } as unknown as APIInteraction
    const response = await routeInteraction(interaction, {
      ...context,
      rest: {
        get: async () => {
          throw new DiscordAPIError(
            { message: "Missing Permissions", code: 50013 },
            50013,
            403,
            "GET",
            "https://discord.com/api/v10/guilds/g",
            { body: undefined, files: undefined },
          )
        },
      } as unknown as REST,
    })
    expect(response).toEqual(ephemeralError("I don't have the permissions to do that."))
  })
})
