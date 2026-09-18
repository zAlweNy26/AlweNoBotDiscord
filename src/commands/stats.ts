import { type APIUnavailableGuild, Routes, SlashCommandBuilder } from "discord.js"
import { embedResponse, SUCCESS_COLOR } from "../respond"
import type { Command } from "./types"

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
      ],
    })
  },
}
