import { type APIEmbedField, SlashCommandBuilder } from "discord.js";
import { getCountryName } from "../lib/countries";
import { formatIsoTimestamp } from "../lib/format";
import { fetchJson } from "../lib/http";
import { ERROR_COLOR } from "../respond";
import { runDeferred } from "./deferred";
import { getStringOption } from "./options";
import type { Command } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

interface SearchResponse {
  items?: { id?: { channelId?: string } }[];
}

interface ChannelResponse {
  items?: {
    snippet?: {
      title?: string;
      description?: string;
      country?: string;
      publishedAt?: string;
      thumbnails?: { default?: { url?: string } };
    };
    statistics?: {
      viewCount?: string;
      videoCount?: string;
      subscriberCount?: string;
      hiddenSubscriberCount?: boolean;
    };
  }[];
}

function error(description: string) {
  return { embeds: [{ color: ERROR_COLOR, description }] };
}

function apiError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  if (message.includes("400") || message.includes("403")) {
    return error("Chiave API di YouTube non valida o quota esaurita.");
  }
  return error("Servizio momentaneamente non disponibile, riprova più tardi.");
}

function formatCount(value: string | undefined) {
  return Number(value ?? 0).toLocaleString("it-IT");
}

export const ytinfoCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("ytinfo")
    .setDescription("Mostra informazioni su un canale YouTube")
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Cerca per nome o per ID")
        .setRequired(true)
        .addChoices({ name: "Nome", value: "nome" }, { name: "ID", value: "id" }),
    )
    .addStringOption((option) =>
      option.setName("valore").setDescription("Nome o ID del canale").setRequired(true),
    ),
  execute(context) {
    return runDeferred(context, async () => {
      const key = context.env.YOUTUBE_API_KEY;
      if (!key) {
        return error("Chiave API di YouTube non configurata.");
      }

      const valore = getStringOption(context.interaction, "valore") ?? "";

      let channelId: string | undefined;
      if (getStringOption(context.interaction, "tipo") === "id") {
        channelId = valore.trim();
      } else {
        try {
          channelId = (
            await fetchJson<SearchResponse>(
              `${API_BASE}/search?part=snippet&type=channel&maxResults=1` +
                `&q=${encodeURIComponent(valore)}&key=${encodeURIComponent(key)}`,
            )
          ).items?.[0]?.id?.channelId;
        } catch (searchError) {
          console.error("YouTube search failed", searchError);
          return apiError(searchError);
        }
        if (!channelId) {
          return error(`Nessun canale trovato per **${valore}**.`);
        }
      }

      let data: ChannelResponse;
      try {
        data = await fetchJson<ChannelResponse>(
          `${API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}` +
            `&key=${encodeURIComponent(key)}`,
        );
      } catch (channelError) {
        console.error("YouTube channels request failed", channelError);
        return apiError(channelError);
      }

      const channel = data.items?.[0];
      if (!channel?.snippet) {
        return error(`Nessun canale trovato per **${valore}**.`);
      }

      const snippet = channel.snippet;
      const statistics = channel.statistics ?? {};
      const fields: APIEmbedField[] = [
        {
          name: "Iscritti",
          value: statistics.hiddenSubscriberCount
            ? "Nascosti"
            : formatCount(statistics.subscriberCount),
          inline: true,
        },
        { name: "Video", value: formatCount(statistics.videoCount), inline: true },
        { name: "Visualizzazioni", value: formatCount(statistics.viewCount), inline: true },
        {
          name: "Paese",
          value: snippet.country ? getCountryName(snippet.country) : "Sconosciuto",
          inline: true,
        },
        {
          name: "Creato il",
          value: snippet.publishedAt ? formatIsoTimestamp(snippet.publishedAt) : "Sconosciuto",
          inline: true,
        },
      ];
      if (snippet.description) {
        fields.push({
          name: "Descrizione",
          value:
            snippet.description.length > 200
              ? `${snippet.description.slice(0, 200)}…`
              : snippet.description,
        });
      }

      const thumbUrl = snippet.thumbnails?.default?.url;
      return {
        embeds: [
          {
            color: 0xff0000,
            title: snippet.title ?? valore,
            thumbnail: thumbUrl ? { url: thumbUrl } : undefined,
            fields,
          },
        ],
      };
    });
  },
};
