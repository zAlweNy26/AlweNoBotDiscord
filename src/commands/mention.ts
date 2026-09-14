import { ApplicationCommandOptionType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { getGuildSettings, updateGuildSettings } from "../db"
import { ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond"
import type { Command } from "./types"

export const mentionCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("mention")
    .setDescription("Configura le risposte del bot quando viene taggato")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand.setName("enable").setDescription("Attiva le risposte ai tag"))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disattiva le risposte ai tag"))
    .addSubcommand((subcommand) =>
      subcommand.setName("mostra").setDescription("Mostra lo stato delle risposte ai tag"),
    ),

  async execute({ env, interaction }) {
    const guildId = interaction.guild_id
    if (!guildId) {
      return ephemeralError("Questo comando può essere usato solo in un server.")
    }
    const subcommand = interaction.data.options?.[0]
    if (subcommand?.type !== ApplicationCommandOptionType.Subcommand) {
      return ephemeralError("Sottocomando non valido.")
    }

    switch (subcommand.name) {
      case "enable":
      case "disable": {
        const enabled = subcommand.name === "enable"
        await updateGuildSettings(env.DB, guildId, { mentionEnabled: enabled })
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: enabled
            ? "✅ Ora rispondo a chi mi tagga. Buona fortuna."
            : "🛑 Non rispondo più a chi mi tagga.",
        })
      }
      case "mostra":
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: "⚙️ Configurazione risposte ai tag",
          fields: [
            {
              name: "Stato",
              value: (await getGuildSettings(env.DB, guildId))?.mentionEnabled ? "Attivo ✅" : "Disattivato 🛑",
              inline: true,
            },
          ],
        })
      default:
        return ephemeralError("Sottocomando non valido.")
    }
  },
}
