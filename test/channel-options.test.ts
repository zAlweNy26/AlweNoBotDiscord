import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ChannelType,
} from "discord.js"
import { describe, expect, it } from "vitest"
import { activityCommand } from "../src/commands/activity"
import { counterCommand, farewellCommand, welcomeCommand } from "../src/commands/config"
import { getSubcommand, getSubOption } from "../src/commands/options"
import { reactionroleCommand } from "../src/commands/reactionrole"
import { summaryCommand } from "../src/commands/summary"
import type { Command } from "../src/commands/types"

interface JsonOption {
  name?: string
  options?: JsonOption[]
  channel_types?: number[]
}

function findOption(command: Command, path: string[]): JsonOption | undefined {
  let options = (command.data.toJSON() as { options?: JsonOption[] }).options
  let found: JsonOption | undefined
  for (const step of path) {
    found = options?.find((option) => option.name === step)
    if (!found) return undefined
    options = found.options
  }
  return found
}

const MESSAGE_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement]

const cases: { label: string; command: Command; path: string[]; channelTypes: ChannelType[] }[] = [
  { label: "activity", command: activityCommand, path: ["channel"], channelTypes: MESSAGE_CHANNEL_TYPES },
  { label: "summary add", command: summaryCommand, path: ["add", "channel"], channelTypes: MESSAGE_CHANNEL_TYPES },
  {
    label: "summary remove",
    command: summaryCommand,
    path: ["remove", "channel"],
    channelTypes: MESSAGE_CHANNEL_TYPES,
  },
  {
    label: "reactionrole create",
    command: reactionroleCommand,
    path: ["create", "channel"],
    channelTypes: MESSAGE_CHANNEL_TYPES,
  },
  {
    label: "reactionrole delete",
    command: reactionroleCommand,
    path: ["delete", "channel"],
    channelTypes: MESSAGE_CHANNEL_TYPES,
  },
  {
    label: "welcome",
    command: welcomeCommand,
    path: ["channel", "channel"],
    channelTypes: MESSAGE_CHANNEL_TYPES,
  },
  {
    label: "farewell",
    command: farewellCommand,
    path: ["channel", "channel"],
    channelTypes: MESSAGE_CHANNEL_TYPES,
  },
  { label: "counter", command: counterCommand, path: ["channel", "channel"], channelTypes: [ChannelType.GuildVoice] },
]

describe("channel option types", () => {
  it.each(cases)("$label restricts its channel option", ({ command, path, channelTypes }) => {
    expect(findOption(command, path)?.channel_types).toEqual(channelTypes)
  })
})

function subcommand(name: string, options: unknown[] = []) {
  return {
    type: ApplicationCommandOptionType.Subcommand,
    name,
    options,
  } as unknown as APIApplicationCommandInteractionDataSubcommandOption
}

function interactionWith(options: unknown[]) {
  return { data: { options } } as unknown as APIChatInputApplicationCommandInteraction
}

describe("subcommand option access", () => {
  it("returns the first option when it is a subcommand", () => {
    expect(getSubcommand(interactionWith([subcommand("add")]))?.name).toBe("add")
  })

  it("returns undefined when the first option is not a subcommand", () => {
    const other = { type: ApplicationCommandOptionType.String, name: "value", value: "x" }
    expect(getSubcommand(interactionWith([other]))).toBeUndefined()
  })

  it("returns undefined without options", () => {
    expect(getSubcommand(interactionWith([]))).toBeUndefined()
  })

  it("reads a matching sub-option", () => {
    const add = subcommand("add", [
      { type: ApplicationCommandOptionType.Integer, name: "threshold", value: 25 },
      { type: ApplicationCommandOptionType.Channel, name: "channel", value: "123" },
    ])
    expect(getSubOption(add, "channel", ApplicationCommandOptionType.Channel)).toBe("123")
    expect(getSubOption(add, "threshold", ApplicationCommandOptionType.Integer)).toBe(25)
  })

  it("ignores a name match with the wrong type", () => {
    const add = subcommand("add", [{ type: ApplicationCommandOptionType.Integer, name: "threshold", value: 25 }])
    expect(getSubOption(add, "threshold", ApplicationCommandOptionType.String)).toBeUndefined()
  })

  it("returns undefined for a missing sub-option", () => {
    expect(getSubOption(subcommand("remove"), "channel", ApplicationCommandOptionType.Channel)).toBeUndefined()
  })
})
