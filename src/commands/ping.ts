import { type APIMessage, Routes, SlashCommandBuilder } from "discord.js";
import { snowflakeToDate } from "../lib/format";
import { SUCCESS_COLOR } from "../respond";
import { runDeferred } from "./deferred";
import type { Command } from "./types";

export const pingCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder().setName("ping").setDescription("Mostra la latenza del bot"),

  async execute(context) {
    return runDeferred(context, async () => {
      let replyTimestamp: number | undefined;
      for (let attempt = 0; attempt < 20 && replyTimestamp === undefined; attempt += 1) {
        try {
          const reply = (await context.rest.get(
            Routes.webhookMessage(
              context.env.DISCORD_APPLICATION_ID,
              context.interaction.token,
              "@original",
            ),
          )) as APIMessage;
          replyTimestamp = new Date(reply.timestamp).getTime();
        } catch {
          await scheduler.wait(100);
        }
      }

      const latency =
        (replyTimestamp ?? Date.now()) - snowflakeToDate(context.interaction.id).getTime();
      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            title: "🏓 Pong!",
            description: `Latenza: **${latency} ms**`,
          },
        ],
      };
    });
  },
};
