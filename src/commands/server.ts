import { type APIEmbedField, type APIGuild, Routes, SlashCommandBuilder } from "discord.js"
import { guildIconUrl } from "../lib/discord"
import { formatDate, snowflakeToDate } from "../lib/format"
import { ephemeralError, SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import type { Command } from "./types"

export const serverCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder().setName("server").setDescription("Show information about the server"),
  execute(context) {
    const { rest, interaction, t, locale } = context
    const guildId = interaction.guild_id
    if (!guildId) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    return runDeferred(context, async () => {
      const guild = (await rest.get(Routes.guild(guildId), {
        query: new URLSearchParams({ with_counts: "true" }),
      })) as APIGuild & {
        approximate_member_count?: number
        approximate_presence_count?: number
      }
      const fields: APIEmbedField[] = [
        { name: t(($) => $.commands.server.owner), value: `<@${guild.owner_id}>`, inline: true },
        {
          name: t(($) => $.commands.server.members),
          value: String(guild.approximate_member_count ?? 0),
          inline: true,
        },
      ]
      if (guild.approximate_presence_count !== undefined) {
        fields.push({
          name: t(($) => $.commands.server.online),
          value: String(guild.approximate_presence_count),
          inline: true,
        })
      }
      fields.push({ name: t(($) => $.commands.server.roles), value: String(guild.roles.length), inline: true })
      fields.push({
        name: t(($) => $.commands.server.created),
        value: formatDate(snowflakeToDate(guild.id), false, locale),
        inline: true,
      })
      if (guild.afk_channel_id) {
        fields.push({ name: t(($) => $.commands.server.afkChannel), value: `<#${guild.afk_channel_id}>`, inline: true })
      }
      const icon = guildIconUrl(guild)
      return {
        embeds: [{ color: SUCCESS_COLOR, title: guild.name, thumbnail: icon ? { url: icon } : undefined, fields }],
      }
    })
  },
}
