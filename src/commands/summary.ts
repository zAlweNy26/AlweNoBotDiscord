import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIMessage,
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  Routes,
  SlashCommandBuilder,
} from "discord.js"
import { addSummaryChannel, getSummaryChannel, listSummaryChannelsForGuild, removeSummaryChannel } from "../db"
import { permissionErrorMessage } from "../lib/discord-errors"
import { deferredResponse, ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond"
import { getSummaryStatus } from "../summary"
import type { Command } from "./types"

const MIN_THRESHOLD = 10
const MAX_THRESHOLD = 500
const DEFAULT_THRESHOLD = 100

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

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

function getChannelId(subcommand: APIApplicationCommandInteractionDataSubcommandOption) {
  const channelId = getSubOption(subcommand, "channel", ApplicationCommandOptionType.Channel)
  return typeof channelId === "string" ? channelId : undefined
}

export const summaryCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Configure automatic channel summaries")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Start summarizing a channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to summarize")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("threshold")
            .setDescription(`Messages per summary (${MIN_THRESHOLD}-${MAX_THRESHOLD})`)
            .setMinValue(MIN_THRESHOLD)
            .setMaxValue(MAX_THRESHOLD),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Stop summarizing a channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to stop summarizing")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List summarized channels"))
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Show how close each channel is to its next summary"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("manual")
        .setDescription("Summarize recent messages on demand")
        .addIntegerOption((option) =>
          option
            .setName("messages")
            .setDescription(`How many recent messages to summarize (${MIN_THRESHOLD}-${MAX_THRESHOLD})`)
            .setMinValue(MIN_THRESHOLD)
            .setMaxValue(MAX_THRESHOLD)
            .setRequired(true),
        ),
    ),
  async execute(context) {
    const { env, rest, interaction, t, locale } = context
    const guildId = interaction.guild_id
    if (!guildId) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const subcommand = getSubcommand(interaction)
    if (!subcommand) {
      return ephemeralError(t(($) => $.commands.summary.invalidSubcommand))
    }
    if (subcommand.name !== "manual") {
      const permissions = interaction.member?.permissions
      const hasManageGuild =
        permissions !== undefined &&
        (BigInt(permissions) & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild
      if (!hasManageGuild) {
        return ephemeralError(t(($) => $.commands.summary.manageGuildRequired))
      }
    }

    switch (subcommand.name) {
      case "add": {
        const channelId = getChannelId(subcommand)
        if (!channelId) {
          return ephemeralError(t(($) => $.commands.summary.invalidChannel))
        }
        const requested = getSubOption(subcommand, "threshold", ApplicationCommandOptionType.Integer)
        const threshold =
          typeof requested === "number" ? clamp(requested, MIN_THRESHOLD, MAX_THRESHOLD) : DEFAULT_THRESHOLD

        let baseline = "0"
        try {
          baseline =
            (
              (await rest.get(Routes.channelMessages(channelId), {
                query: new URLSearchParams({ limit: "1" }),
              })) as APIMessage[]
            )[0]?.id ?? "0"
        } catch (error) {
          console.error(`Failed to read baseline for channel ${channelId}`, error)
          return ephemeralError(t(($) => $.commands.summary.readError))
        }

        await addSummaryChannel(env.DB, guildId, channelId, threshold, baseline)
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: t(($) => $.commands.summary.enabled, { channelId, threshold }),
        })
      }
      case "remove": {
        const channelId = getChannelId(subcommand)
        if (!channelId) {
          return ephemeralError(t(($) => $.commands.summary.invalidChannel))
        }
        if (!(await getSummaryChannel(env.DB, guildId, channelId))) {
          return ephemeralEmbed({
            color: SUCCESS_COLOR,
            description: t(($) => $.commands.summary.notConfigured, { channelId }),
          })
        }
        await removeSummaryChannel(env.DB, guildId, channelId)
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: t(($) => $.commands.summary.disabled, { channelId }),
        })
      }
      case "list": {
        const rows = await listSummaryChannelsForGuild(env.DB, guildId)
        if (rows.length === 0) {
          return ephemeralEmbed({
            color: SUCCESS_COLOR,
            description: t(($) => $.commands.summary.nothing),
          })
        }
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: t(($) => $.commands.summary.listTitle),
          description: rows
            .map((row) => t(($) => $.commands.summary.listRow, { channelId: row.channelId, threshold: row.threshold }))
            .join("\n"),
        })
      }
      case "status": {
        const rows = await listSummaryChannelsForGuild(env.DB, guildId)
        if (rows.length === 0) {
          return ephemeralEmbed({
            color: SUCCESS_COLOR,
            description: t(($) => $.commands.summary.nothing),
          })
        }
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: t(($) => $.commands.summary.statusTitle),
          description: (
            await Promise.all(
              rows.map(async (row) => {
                try {
                  const status = await getSummaryStatus(rest, row)
                  const progress = t(($) => $.commands.summary.progress, {
                    counted: status.counted,
                    threshold: row.threshold,
                  })
                  if (status.ready) {
                    return t(($) => $.commands.summary.statusReady, {
                      channelId: row.channelId,
                      progress,
                    })
                  }
                  return t(($) => $.commands.summary.statusToGo, {
                    channelId: row.channelId,
                    progress,
                    count: row.threshold - status.counted,
                  })
                } catch (error) {
                  console.error(`Failed to read status for channel ${row.channelId}`, error)
                  return t(($) => $.commands.summary.noAccess, { channelId: row.channelId })
                }
              }),
            )
          ).join("\n"),
        })
      }
      case "manual": {
        const channelId = interaction.channel_id
        if (!channelId) {
          return ephemeralError(t(($) => $.commands.summary.invalidChannel))
        }
        const permissionError = permissionErrorMessage(t, locale, interaction, PermissionFlagsBits.ReadMessageHistory)
        if (permissionError) {
          return ephemeralError(permissionError)
        }
        const requested = getSubOption(subcommand, "messages", ApplicationCommandOptionType.Integer)
        const needed = typeof requested === "number" ? clamp(requested, MIN_THRESHOLD, MAX_THRESHOLD) : MIN_THRESHOLD
        try {
          await env.alwenobot_summary.send({
            kind: "summary",
            guildId,
            channelId,
            needed,
            token: interaction.token,
            locale,
          })
        } catch (error) {
          console.error(`Failed to queue manual summary for channel ${channelId}`, error)
          return ephemeralError(t(($) => $.commands.summary.queueError))
        }
        return deferredResponse()
      }
      default:
        return ephemeralError(t(($) => $.commands.summary.invalidSubcommand))
    }
  },
}
