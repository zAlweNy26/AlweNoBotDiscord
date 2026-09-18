import { ApplicationCommandOptionType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { getGuildSettings, updateGuildSettings } from "../db"
import { isLocale, type Locale } from "../lib/i18n"
import { embedResponse, ephemeralError, SUCCESS_COLOR } from "../respond"
import { getStringOption } from "./options"
import type { Command } from "./types"

function getSubcommand(interaction: Parameters<Command["execute"]>[0]["interaction"]) {
  return interaction.data.options?.[0]?.type === ApplicationCommandOptionType.Subcommand
    ? interaction.data.options?.[0]
    : undefined
}

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
}

export const languageCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Set the language used for this server's messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set the server language")
        .addStringOption((option) =>
          option
            .setName("language")
            .setDescription("Language to use")
            .setRequired(true)
            .addChoices({ name: "English", value: "en" }, { name: "Italiano", value: "it" }),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("show").setDescription("Show the current server language")),

  async execute({ env, interaction, t }) {
    if (!interaction.guild_id) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const subcommand = getSubcommand(interaction)
    switch (subcommand?.name) {
      case "set": {
        const language = getStringOption(interaction, "language")
        if (!language || !isLocale(language)) {
          return ephemeralError(t(($) => $.commands.language.invalidSubcommand))
        }
        await updateGuildSettings(env.DB, interaction.guild_id, { locale: language })
        return embedResponse({
          color: SUCCESS_COLOR,
          description: t(($) => $.commands.language.updated, { language: LANGUAGE_NAMES[language] }),
        })
      }
      case "show": {
        const settings = await getGuildSettings(env.DB, interaction.guild_id)
        const locale = settings?.locale && isLocale(settings.locale) ? settings.locale : null
        return embedResponse({
          color: SUCCESS_COLOR,
          title: t(($) => $.commands.language.title),
          fields: [
            {
              name: t(($) => $.commands.language.status),
              value: locale ? LANGUAGE_NAMES[locale] : t(($) => $.commands.language.unset),
            },
          ],
        })
      }
      default:
        return ephemeralError(t(($) => $.commands.language.invalidSubcommand))
    }
  },
}
