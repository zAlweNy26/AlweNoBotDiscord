import { ApplicationCommandOptionType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { getGuildSettings, updateGuildSettings } from "../db"
import { ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond"
import type { Command } from "./types"

export const interfereCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("interfere")
    .setDescription("Configure the bot butting into conversations uninvited")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand.setName("enable").setDescription("Enable spontaneous replies"))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable spontaneous replies"))
    .addSubcommand((subcommand) => subcommand.setName("show").setDescription("Show the spontaneous reply status")),

  async execute({ env, interaction, t }) {
    const guildId = interaction.guild_id
    if (!guildId) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const subcommand = interaction.data.options?.[0]
    if (subcommand?.type !== ApplicationCommandOptionType.Subcommand) {
      return ephemeralError(t(($) => $.commands.interfere.invalidSubcommand))
    }

    switch (subcommand.name) {
      case "enable":
      case "disable": {
        const enabled = subcommand.name === "enable"
        await updateGuildSettings(env.DB, guildId, { interfereEnabled: enabled })
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: enabled ? t(($) => $.commands.interfere.enabled) : t(($) => $.commands.interfere.disabled),
        })
      }
      case "show":
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: t(($) => $.commands.interfere.title),
          fields: [
            {
              name: t(($) => $.commands.interfere.status),
              value: (await getGuildSettings(env.DB, guildId))?.interfereEnabled
                ? t(($) => $.commands.interfere.statusOn)
                : t(($) => $.commands.interfere.statusOff),
              inline: true,
            },
          ],
        })
      default:
        return ephemeralError(t(($) => $.commands.interfere.invalidSubcommand))
    }
  },
}
