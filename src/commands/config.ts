import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type ApplicationCommandOptionAllowedChannelTypes,
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"
import { ensureGuildSettings, type GuildSettingsPatch, updateGuildSettings } from "../db"
import { embedResponse, ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond"
import type { Command } from "./types"

function getSubcommand(interaction: Parameters<Command["execute"]>[0]["interaction"]) {
  return interaction.data.options?.[0]?.type === ApplicationCommandOptionType.Subcommand
    ? interaction.data.options?.[0]
    : undefined
}

function getSubOption(
  subcommand: APIApplicationCommandInteractionDataSubcommandOption,
  name: string,
  type: ApplicationCommandOptionType,
) {
  const option = subcommand.options?.find((candidate) => candidate.name === name && candidate.type === type)
  if (!option || !("value" in option)) return undefined
  return typeof option.value === "string" || typeof option.value === "number" ? option.value : undefined
}

function buildConfigCommand(spec: {
  name: "welcome" | "farewell" | "counter"
  description: string
  label: string
  title: string
  enabledField: "welcomeEnabled" | "farewellEnabled" | "counterEnabled"
  channelField: "welcomeChannelId" | "farewellChannelId" | "counterChannelId"
  textField: "welcomeMessage" | "farewellMessage" | "counterFormat"
  textOptionName: "message" | "format"
  textDescription: string
  channelTypes: ApplicationCommandOptionAllowedChannelTypes[]
}) {
  const data = new SlashCommandBuilder()
    .setName(spec.name)
    .setDescription(spec.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand.setName("enable").setDescription(`Enable ${spec.label}`))
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription(`Disable ${spec.label}`))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription(`Set the channel for ${spec.label}`)
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to use")
            .addChannelTypes(...spec.channelTypes)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(spec.textOptionName)
        .setDescription(spec.textDescription)
        .addStringOption((option) => option.setName("text").setDescription("New text").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("show").setDescription(`Show the ${spec.label} configuration`))

  return {
    category: "Info",
    data,
    async execute({ env, interaction, t }) {
      const guildId = interaction.guild_id
      if (!guildId) {
        return ephemeralError(t(($) => $.common.guildOnly))
      }
      const subcommand = getSubcommand(interaction)
      if (!subcommand) {
        return ephemeralError(t(($) => $.commands.config.invalidSubcommand))
      }

      const db = env.DB
      const settings = await ensureGuildSettings(db, guildId)
      const patch: GuildSettingsPatch = {}

      switch (subcommand.name) {
        case "enable":
          patch[spec.enabledField] = true
          break
        case "disable":
          patch[spec.enabledField] = false
          break
        case "channel": {
          const channelId = getSubOption(subcommand, "channel", ApplicationCommandOptionType.Channel)
          if (typeof channelId !== "string") {
            return ephemeralError(t(($) => $.commands.config.invalidChannel))
          }
          patch[spec.channelField] = channelId
          break
        }
        case spec.textOptionName: {
          const text = getSubOption(subcommand, "text", ApplicationCommandOptionType.String)
          if (typeof text !== "string" || text.trim().length === 0) {
            return ephemeralError(t(($) => $.commands.config.invalidText))
          }
          patch[spec.textField] = text
          break
        }
        case "show": {
          const channelId = settings[spec.channelField]
          return embedResponse({
            color: SUCCESS_COLOR,
            title: t(($) => $.commands.config.title, { title: t(($) => $.commands.config.titles[spec.name]) }),
            fields: [
              {
                name: t(($) => $.commands.config.status),
                value: settings[spec.enabledField]
                  ? t(($) => $.commands.config.enabled)
                  : t(($) => $.commands.config.disabled),
                inline: true,
              },
              {
                name: t(($) => $.commands.config.channel),
                value: channelId ? `<#${channelId}>` : t(($) => $.commands.config.notSet),
                inline: true,
              },
              {
                name:
                  spec.textOptionName === "format"
                    ? t(($) => $.commands.config.format)
                    : t(($) => $.commands.config.message),
                value:
                  settings[spec.textField] ??
                  t(($) => $.gateway.defaults[spec.name], { utente: "{{utente}}", membri: "{{membri}}" }),
              },
            ],
          })
        }
        default:
          return ephemeralError(t(($) => $.commands.config.invalidSubcommand))
      }

      await updateGuildSettings(db, guildId, patch)
      return ephemeralEmbed({
        color: SUCCESS_COLOR,
        description: t(($) => $.commands.config.updated, { label: t(($) => $.commands.config.labels[spec.name]) }),
      })
    },
  } satisfies Command
}

export const welcomeCommand = buildConfigCommand({
  name: "welcome",
  description: "Configure the welcome message",
  label: "the welcome message",
  title: "Welcome message",
  enabledField: "welcomeEnabled",
  channelField: "welcomeChannelId",
  textField: "welcomeMessage",
  textOptionName: "message",
  textDescription: "Set the welcome message ({{utente}}, {{membri}})",
  channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
})

export const farewellCommand = buildConfigCommand({
  name: "farewell",
  description: "Configure the farewell message",
  label: "the farewell message",
  title: "Farewell message",
  enabledField: "farewellEnabled",
  channelField: "farewellChannelId",
  textField: "farewellMessage",
  textOptionName: "message",
  textDescription: "Set the farewell message ({{utente}}, {{membri}})",
  channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
})

export const counterCommand = buildConfigCommand({
  name: "counter",
  description: "Configure the member counter",
  label: "the member counter",
  title: "Member counter",
  enabledField: "counterEnabled",
  channelField: "counterChannelId",
  textField: "counterFormat",
  textOptionName: "format",
  textDescription: "Set the counter format ({{membri}})",
  channelTypes: [ChannelType.GuildVoice],
})
