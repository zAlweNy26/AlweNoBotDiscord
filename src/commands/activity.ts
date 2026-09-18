import { type APIMessage, ChannelType, PermissionFlagsBits, type REST, Routes, SlashCommandBuilder } from "discord.js"
import type { TFunction } from "i18next"
import { type ActivityMessage, rankActivity } from "../lib/activity"
import { discordErrorDetail, permissionErrorMessage } from "../lib/discord-errors"
import { createTranslator } from "../lib/i18n"
import { deferredResponse, ERROR_COLOR, ephemeralError, SUCCESS_COLOR } from "../respond"
import { isHumanMessage } from "../summary"
import { getChannelOption } from "./options"
import type { Command } from "./types"

const WINDOW_DAYS = 7
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000
const PAGE_LIMIT = 100
const TOP_AUTHORS = 10
const MEDALS = ["🥇", "🥈", "🥉"]

export interface ActivityReportMessage {
  kind: "activity"
  channelId: string
  token: string
  locale: string
}

export interface ActivityReportDeps {
  rest: REST
  applicationId: string
}

async function fetchHumansSince(rest: REST, channelId: string, since: number) {
  const humans: ActivityMessage[] = []
  let before: string | undefined

  for (;;) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) })
    if (before) {
      query.set("before", before)
    }
    const page = (await rest.get(Routes.channelMessages(channelId), { query })) as APIMessage[]
    if (!Array.isArray(page) || page.length === 0) {
      return humans
    }
    for (const message of page) {
      if (Date.parse(message.timestamp) < since) {
        return humans
      }
      if (isHumanMessage(message)) {
        humans.push({ authorId: message.author.id, content: message.content })
      }
    }
    const oldest = page[page.length - 1]
    if (!oldest || page.length < PAGE_LIMIT) {
      return humans
    }
    before = oldest.id
  }
}

export async function runActivityReport(rest: REST, channelId: string, t: TFunction) {
  let humans: ActivityMessage[]
  try {
    humans = await fetchHumansSince(rest, channelId, Date.now() - WINDOW_MS)
  } catch (error) {
    console.error(`Failed to read messages for channel ${channelId}${discordErrorDetail(error)}`, error)
    return {
      embeds: [
        {
          color: ERROR_COLOR,
          description: t(($) => $.commands.activity.readError, { channelId }),
        },
      ],
    }
  }

  const report = rankActivity(humans, TOP_AUTHORS)
  if (report.total === 0) {
    return {
      embeds: [
        {
          color: ERROR_COLOR,
          description: t(($) => $.commands.activity.noMessages, { channelId, days: WINDOW_DAYS }),
        },
      ],
    }
  }

  return {
    embeds: [
      {
        color: SUCCESS_COLOR,
        title: t(($) => $.commands.activity.title),
        description: report.top
          .map((entry, index) => {
            const rank = MEDALS[index] ?? `**${index + 1}.**`
            const average = Math.round(entry.characters / entry.messages)
            return t(($) => $.commands.activity.entry, {
              rank,
              authorId: entry.authorId,
              messages: entry.messages,
              share: entry.share.toFixed(1),
              average,
            })
          })
          .join("\n"),
        fields: [
          { name: t(($) => $.commands.activity.channel), value: `<#${channelId}>`, inline: true },
          { name: t(($) => $.commands.activity.analyzed), value: String(report.total), inline: true },
          { name: t(($) => $.commands.activity.participants), value: String(report.participants), inline: true },
        ],
        footer: { text: t(($) => $.commands.activity.footer, { days: WINDOW_DAYS }) },
      },
    ],
  }
}

export async function deliverActivityReport(deps: ActivityReportDeps, message: ActivityReportMessage) {
  const t = createTranslator(message.locale)
  const body = await runActivityReport(deps.rest, message.channelId, t)
  await deps.rest.patch(Routes.webhookMessage(deps.applicationId, message.token, "@original"), {
    body,
  })
}

export const activityCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Show the most active users in a channel over the last week")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to analyze (defaults to the current one)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  async execute({ env, interaction, t, locale }) {
    if (!interaction.guild_id) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const requested = getChannelOption(interaction, "channel")
    if (!requested) {
      const permissionError = permissionErrorMessage(t, locale, interaction, PermissionFlagsBits.ReadMessageHistory)
      if (permissionError) {
        return ephemeralError(permissionError)
      }
    }
    const channelId = requested ?? interaction.channel_id
    try {
      await env.alwenobot_summary.send({
        kind: "activity",
        channelId,
        token: interaction.token,
        locale,
      } satisfies ActivityReportMessage)
    } catch (error) {
      console.error(`Failed to queue the activity report for channel ${channelId}`, error)
      return ephemeralError(t(($) => $.commands.activity.queueError))
    }
    return deferredResponse()
  },
}
