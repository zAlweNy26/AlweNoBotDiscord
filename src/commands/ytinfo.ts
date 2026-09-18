import { type APIEmbedField, SlashCommandBuilder } from "discord.js"
import type { TFunction } from "i18next"
import { getCountryName } from "../lib/countries"
import { formatIsoTimestamp } from "../lib/format"
import { fetchJson } from "../lib/http"
import { ERROR_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getStringOption } from "./options"
import type { Command } from "./types"

const API_BASE = "https://www.googleapis.com/youtube/v3"

interface SearchResponse {
  items?: { id?: { channelId?: string } }[]
}

interface ChannelResponse {
  items?: {
    snippet?: {
      title?: string
      description?: string
      country?: string
      publishedAt?: string
      thumbnails?: { default?: { url?: string } }
    }
    statistics?: {
      viewCount?: string
      videoCount?: string
      subscriberCount?: string
      hiddenSubscriberCount?: boolean
    }
  }[]
}

function error(description: string) {
  return { embeds: [{ color: ERROR_COLOR, description }] }
}

function apiError(cause: unknown, t: TFunction) {
  const message = cause instanceof Error ? cause.message : ""
  if (message.includes("400") || message.includes("403")) {
    return error(t(($) => $.commands.ytinfo.apiKeyInvalid))
  }
  return error(t(($) => $.commands.ytinfo.serviceUnavailable))
}

function formatCount(value: string | undefined) {
  return Number(value ?? 0).toLocaleString("en-US")
}

export const ytinfoCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("ytinfo")
    .setDescription("Show information about a YouTube channel")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Search by name or by ID")
        .setRequired(true)
        .addChoices({ name: "Name", value: "name" }, { name: "ID", value: "id" }),
    )
    .addStringOption((option) => option.setName("value").setDescription("Channel name or ID").setRequired(true)),
  execute(context) {
    return runDeferred(context, async () => {
      const { t, locale } = context
      const key = context.env.YOUTUBE_API_KEY
      if (!key) {
        return error(t(($) => $.commands.ytinfo.apiKeyMissing))
      }

      const value = getStringOption(context.interaction, "value") ?? ""

      let channelId: string | undefined
      if (getStringOption(context.interaction, "type") === "id") {
        channelId = value.trim()
      } else {
        try {
          channelId = (
            await fetchJson<SearchResponse>(
              `${API_BASE}/search?part=snippet&type=channel&maxResults=1` +
                `&q=${encodeURIComponent(value)}&key=${encodeURIComponent(key)}`,
            )
          ).items?.[0]?.id?.channelId
        } catch (searchError) {
          console.error("YouTube search failed", searchError)
          return apiError(searchError, t)
        }
        if (!channelId) {
          return error(t(($) => $.commands.ytinfo.noChannel, { value }))
        }
      }

      let data: ChannelResponse
      try {
        data = await fetchJson<ChannelResponse>(
          `${API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}` +
            `&key=${encodeURIComponent(key)}`,
        )
      } catch (channelError) {
        console.error("YouTube channels request failed", channelError)
        return apiError(channelError, t)
      }

      const channel = data.items?.[0]
      if (!channel?.snippet) {
        return error(t(($) => $.commands.ytinfo.noChannel, { value }))
      }

      const snippet = channel.snippet
      const statistics = channel.statistics ?? {}
      const fields: APIEmbedField[] = [
        {
          name: t(($) => $.commands.ytinfo.subscribers),
          value: statistics.hiddenSubscriberCount
            ? t(($) => $.commands.ytinfo.hidden)
            : formatCount(statistics.subscriberCount),
          inline: true,
        },
        { name: t(($) => $.commands.ytinfo.videos), value: formatCount(statistics.videoCount), inline: true },
        { name: t(($) => $.commands.ytinfo.views), value: formatCount(statistics.viewCount), inline: true },
        {
          name: t(($) => $.commands.ytinfo.country),
          value: snippet.country ? getCountryName(snippet.country, locale) : t(($) => $.commands.ytinfo.unknown),
          inline: true,
        },
        {
          name: t(($) => $.commands.ytinfo.created),
          value: snippet.publishedAt
            ? formatIsoTimestamp(snippet.publishedAt, locale)
            : t(($) => $.commands.ytinfo.unknown),
          inline: true,
        },
      ]
      if (snippet.description) {
        fields.push({
          name: t(($) => $.commands.ytinfo.description),
          value: snippet.description.length > 200 ? `${snippet.description.slice(0, 200)}…` : snippet.description,
        })
      }

      const thumbUrl = snippet.thumbnails?.default?.url
      return {
        embeds: [
          {
            color: 0xff0000,
            title: snippet.title ?? value,
            thumbnail: thumbUrl ? { url: thumbUrl } : undefined,
            fields,
          },
        ],
      }
    })
  },
}
