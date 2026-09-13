import { type APIUnavailableGuild, Routes, SlashCommandBuilder } from "discord.js";
import { embedResponse, SUCCESS_COLOR } from "../respond";
import type { Command } from "./types";

const startedAt = Date.now();

function formatUptime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

export const statsCommand: Command = {
  category: "Info",
  ownerOnly: true,
  data: new SlashCommandBuilder().setName("stats").setDescription("Mostra le statistiche del bot"),
  async execute({ rest }) {
    const start = Date.now();
    await rest.get(Routes.currentApplication());
    const latency = Date.now() - start;
    return embedResponse({
      color: SUCCESS_COLOR,
      title: "📊 Statistiche",
      fields: [
        { name: "Latenza API", value: `${latency} ms`, inline: true },
        {
          name: "Server",
          value: String(((await rest.get(Routes.userGuilds())) as APIUnavailableGuild[]).length),
          inline: true,
        },
        { name: "Uptime worker", value: formatUptime(Date.now() - startedAt), inline: true },
      ],
    });
  },
};
