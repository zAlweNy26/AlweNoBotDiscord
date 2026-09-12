import { SlashCommandBuilder } from "@discordjs/builders";
import { Routes } from "discord-api-types/v10";
import { embedResponse, SUCCESS_COLOR } from "../respond";
import type { Command } from "./types";

export const pingCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder().setName("ping").setDescription("Mostra la latenza del bot"),

  async execute({ rest }) {
    const startedAt = Date.now();
    await rest.get(Routes.currentApplication());
    const latency = Date.now() - startedAt;

    return embedResponse({
      color: SUCCESS_COLOR,
      title: "🏓 Pong!",
      description: `Latenza API: **${latency} ms**`,
    });
  },
};
