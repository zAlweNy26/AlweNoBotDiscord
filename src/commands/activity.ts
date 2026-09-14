import { type APIMessage, type REST, Routes, SlashCommandBuilder } from "discord.js"
import { type ActivityMessage, rankActivity } from "../lib/activity"
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

export async function runActivityReport(rest: REST, channelId: string) {
  let humans: ActivityMessage[]
  try {
    humans = await fetchHumansSince(rest, channelId, Date.now() - WINDOW_MS)
  } catch (error) {
    console.error(`Failed to read messages for channel ${channelId}`, error)
    return {
      embeds: [
        {
          color: ERROR_COLOR,
          description: `Non riesco a leggere i messaggi in <#${channelId}>. Controlla che io abbia accesso al canale.`,
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
          description: `Nessun messaggio negli ultimi ${WINDOW_DAYS} giorni in <#${channelId}>.`,
        },
      ],
    }
  }

  return {
    embeds: [
      {
        color: SUCCESS_COLOR,
        title: "📊 Utenti più attivi",
        description: report.top
          .map((entry, index) => {
            const rank = MEDALS[index] ?? `**${index + 1}.**`
            const average = Math.round(entry.characters / entry.messages)
            return `${rank} <@${entry.authorId}> — **${entry.messages}** messaggi · ${entry.share.toFixed(1)}% · ${average} caratteri/msg`
          })
          .join("\n"),
        fields: [
          { name: "Canale", value: `<#${channelId}>`, inline: true },
          { name: "Messaggi analizzati", value: String(report.total), inline: true },
          { name: "Partecipanti", value: String(report.participants), inline: true },
        ],
        footer: { text: `Ultimi ${WINDOW_DAYS} giorni · solo testo, bot esclusi` },
      },
    ],
  }
}

export async function deliverActivityReport(deps: ActivityReportDeps, message: ActivityReportMessage) {
  const body = await runActivityReport(deps.rest, message.channelId)
  await deps.rest.patch(Routes.webhookMessage(deps.applicationId, message.token, "@original"), {
    body,
  })
}

export const activityCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Mostra gli utenti più attivi di un canale nell'ultima settimana")
    .addChannelOption((option) =>
      option.setName("canale").setDescription("Canale da analizzare (predefinito: quello corrente)"),
    ),
  async execute({ env, interaction }) {
    if (!interaction.guild_id) {
      return ephemeralError("Questo comando può essere usato solo in un server.")
    }
    const channelId = getChannelOption(interaction, "canale") ?? interaction.channel_id
    try {
      await env.alwenobot_summary.send({
        kind: "activity",
        channelId,
        token: interaction.token,
      } satisfies ActivityReportMessage)
    } catch (error) {
      console.error(`Failed to queue the activity report for channel ${channelId}`, error)
      return ephemeralError("Non riesco ad avviare l'analisi. Riprova più tardi.")
    }
    return deferredResponse()
  },
}
