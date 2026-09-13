import { SlashCommandBuilder } from "@discordjs/builders";
import type { APIMessage } from "discord-api-types/v10";
import { PermissionFlagsBits, Routes } from "discord-api-types/v10";
import { ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond";
import { getIntegerOption } from "./options";
import type { Command } from "./types";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export const clearCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Elimina gli ultimi messaggi del canale")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("quantita")
        .setDescription("Numero di messaggi da eliminare (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),
  async execute({ rest, interaction }) {
    if (!interaction.guild_id) {
      return ephemeralError("Questo comando può essere usato solo in un server.");
    }
    const amount = getIntegerOption(interaction, "quantita");
    if (amount === undefined) {
      return ephemeralError("Specifica il numero di messaggi da eliminare.");
    }
    const ids = (
      (await rest.get(Routes.channelMessages(interaction.channel_id), {
        query: new URLSearchParams({ limit: String(amount) }),
      })) as APIMessage[]
    )
      .filter((message) => Date.now() - Date.parse(message.timestamp) < TWO_WEEKS_MS)
      .map((message) => message.id);
    if (ids.length === 0) {
      return ephemeralError("Non ci sono messaggi recenti da eliminare.");
    }
    const [onlyId] = ids;
    if (ids.length === 1 && onlyId) {
      await rest.delete(Routes.channelMessage(interaction.channel_id, onlyId));
    } else {
      await rest.post(Routes.channelBulkDelete(interaction.channel_id), {
        body: { messages: ids },
      });
    }
    return ephemeralEmbed({
      color: SUCCESS_COLOR,
      description: `🗑️ Eliminati **${ids.length}** messaggi.`,
    });
  },
};
