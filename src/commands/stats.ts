import { type APIUnavailableGuild, Routes, SlashCommandBuilder } from "discord.js"
import type { TFunction } from "i18next"
import { embedResponse, SUCCESS_COLOR } from "../respond"
import type { Command } from "./types"

const startedAt = Date.now()

function formatUptime(ms: number, t: TFunction) {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}${t(($) => $.commands.stats.units.days)}`)
  if (hours > 0) parts.push(`${hours}${t(($) => $.commands.stats.units.hours)}`)
  if (minutes > 0) parts.push(`${minutes}${t(($) => $.commands.stats.units.minutes)}`)
  parts.push(`${seconds}${t(($) => $.commands.stats.units.seconds)}`)
  return parts.join(" ")
}

export const statsCommand: Command = {
  category: "Info",
  ownerOnly: true,
  data: new SlashCommandBuilder().setName("stats").setDescription("Show the bot statistics"),
  async execute({ rest, t }) {
    const start = Date.now()
    await rest.get(Routes.currentApplication())
    const latency = Date.now() - start
    return embedResponse({
      color: SUCCESS_COLOR,
      title: t(($) => $.commands.stats.title),
      fields: [
        { name: t(($) => $.commands.stats.apiLatency), value: `${latency} ms`, inline: true },
        {
          name: t(($) => $.commands.stats.servers),
          value: String(((await rest.get(Routes.userGuilds())) as APIUnavailableGuild[]).length),
          inline: true,
        },
        { name: t(($) => $.commands.stats.uptime), value: formatUptime(Date.now() - startedAt, t), inline: true },
      ],
    })
  },
}
