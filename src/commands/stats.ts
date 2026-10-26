import { type APIApplication, Routes, SlashCommandBuilder } from "discord.js"
import { SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import type { Command } from "./types"

export const statsCommand: Command = {
  category: "Info",
  ownerOnly: true,
  data: new SlashCommandBuilder().setName("stats").setDescription("Show the bot statistics"),
  execute(context) {
    const { rest, t } = context
    return runDeferred(context, async () => {
      const start = Date.now()
      const application = (await rest.get(Routes.currentApplication())) as APIApplication
      const latency = Date.now() - start
      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            title: t(($) => $.commands.stats.title),
            fields: [
              { name: t(($) => $.commands.stats.apiLatency), value: `${latency} ms`, inline: true },
              {
                name: t(($) => $.commands.stats.servers),
                value: String(application.approximate_guild_count ?? 0),
                inline: true,
              },
            ],
          },
        ],
      }
    })
  },
}
