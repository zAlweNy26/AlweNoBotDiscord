import { type APIEmbedField, type APIGuild, Routes, SlashCommandBuilder } from "discord.js";
import { guildIconUrl } from "../lib/discord";
import { formatDate, snowflakeToDate } from "../lib/format";
import { embedResponse, ephemeralError, SUCCESS_COLOR } from "../respond";
import type { Command } from "./types";

export const serverCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Mostra informazioni sul server"),
  async execute({ rest, interaction }) {
    if (!interaction.guild_id) {
      return ephemeralError("Questo comando può essere usato solo in un server.");
    }
    const guild = (await rest.get(Routes.guild(interaction.guild_id), {
      query: new URLSearchParams({ with_counts: "true" }),
    })) as APIGuild & {
      approximate_member_count?: number;
      approximate_presence_count?: number;
    };
    const fields: APIEmbedField[] = [
      { name: "Proprietario", value: `<@${guild.owner_id}>`, inline: true },
      {
        name: "Membri",
        value: String(guild.approximate_member_count ?? 0),
        inline: true,
      },
    ];
    if (guild.approximate_presence_count !== undefined) {
      fields.push({
        name: "Online",
        value: String(guild.approximate_presence_count),
        inline: true,
      });
    }
    fields.push({ name: "Ruoli", value: String(guild.roles.length), inline: true });
    fields.push({
      name: "Creato il",
      value: formatDate(snowflakeToDate(guild.id), false),
      inline: true,
    });
    if (guild.afk_channel_id) {
      fields.push({ name: "Canale AFK", value: `<#${guild.afk_channel_id}>`, inline: true });
    }
    const icon = guildIconUrl(guild);
    return embedResponse({
      color: SUCCESS_COLOR,
      title: guild.name,
      thumbnail: icon ? { url: icon } : undefined,
      fields,
    });
  },
};
