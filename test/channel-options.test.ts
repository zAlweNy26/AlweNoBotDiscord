import { ChannelType } from "discord.js"
import { describe, expect, it } from "vitest"
import { activityCommand } from "../src/commands/activity"
import { counterCommand, farewellCommand, welcomeCommand } from "../src/commands/config"
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
