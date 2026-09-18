import { SlashCommandBuilder } from "discord.js"
import { embedResponse, SUCCESS_COLOR } from "../respond"
import { commands } from "./registry"
import type { Command, CommandCategory } from "./types"

const CATEGORY_KEYS: Record<CommandCategory, "mod" | "info" | "misc"> = {
  Mod: "mod",
  Info: "info",
  Misc: "misc",
}

export const helpCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder().setName("help").setDescription("Show the command list"),

  execute({ t }) {
    return embedResponse({
      color: SUCCESS_COLOR,
      title: t(($) => $.commands.help.title),
      fields: (Object.keys(CATEGORY_KEYS) as CommandCategory[]).map((category) => ({
        name: t(($) => $.commands.help.categories[CATEGORY_KEYS[category]]),
        value:
          commands
            .filter((command) => command.category === category)
            .map((command) => `\`/${command.data.name}\``)
            .join(" ") || "—",
      })),
    })
  },
}
