import { SlashCommandBuilder } from "discord.js";
import { embedResponse, SUCCESS_COLOR } from "../respond";
import { commands } from "./registry";
import type { Command, CommandCategory } from "./types";

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  Mod: "🛠️ Moderazione",
  Info: "ℹ️ Informazioni",
  Misc: "🎲 Varie",
};

export const helpCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder().setName("help").setDescription("Mostra l'elenco dei comandi"),

  execute() {
    return embedResponse({
      color: SUCCESS_COLOR,
      title: "📖 Comandi disponibili",
      fields: (Object.keys(CATEGORY_LABELS) as CommandCategory[]).map((category) => ({
        name: CATEGORY_LABELS[category],
        value:
          commands
            .filter((command) => command.category === category)
            .map((command) => `\`/${command.data.name}\``)
            .join(" ") || "—",
      })),
    });
  },
};
