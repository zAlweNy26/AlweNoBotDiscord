import { ApplicationCommandOptionType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { getGuildSettings, updateGuildSettings } from "../db"
import { ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond"
import type { Command } from "./types"

export const mentionCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("mention")
    .setDescription("Configure the bot's replies when it is tagged")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand.setName("enable").setDescription("Enable replies to tags"))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable replies to tags"))
    .addSubcommand((subcommand) => subcommand.setName("show").setDescription("Show the tag reply status")),

  async execute({ env, interaction, t }) {
    const guildId = interaction.guild_id
    if (!guildId) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const subcommand = interaction.data.options?.[0]
    if (subcommand?.type !== ApplicationCommandOptionType.Subcommand) {
      return ephemeralError(t(($) => $.commands.mention.invalidSubcommand))
    }

    switch (subcommand.name) {
      case "enable":
      case "disable": {
        const enabled = subcommand.name === "enable"
        await updateGuildSettings(env.DB, guildId, { mentionEnabled: enabled })
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: enabled ? t(($) => $.commands.mention.enabled) : t(($) => $.commands.mention.disabled),
        })
      }
      case "show":
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: t(($) => $.commands.mention.title),
          fields: [
            {
              name: t(($) => $.commands.mention.status),
              value: (await getGuildSettings(env.DB, guildId))?.mentionEnabled
                ? t(($) => $.commands.mention.statusOn)
                : t(($) => $.commands.mention.statusOff),
              inline: true,
            },
          ],
        })
      default:
        return ephemeralError(t(($) => $.commands.mention.invalidSubcommand))
    }
  },
}
