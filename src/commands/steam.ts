import { type APIEmbed, type APIEmbedField, SlashCommandBuilder } from "discord.js"
import type { TFunction } from "i18next"
import { colorByStatus } from "../lib/colors"
import { getCountryName } from "../lib/countries"
import { formatUnixTimestamp } from "../lib/format"
import { fetchJson } from "../lib/http"
import { parseSteamInput } from "../lib/steam"
import { ERROR_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getStringOption } from "./options"
import type { Command } from "./types"

const API_BASE = "https://api.steampowered.com"

interface ResolveVanityResponse {
  response: { steamid?: string; success: number; message?: string }
}

interface PlayerSummary {
  steamid: string
  personaname: string
  avatarfull: string
  personastate: number
  loccountrycode?: string
  timecreated?: number
  lastlogoff?: number
  gameextrainfo?: string
  gameid?: string
}

interface PlayerSummariesResponse {
  response: { players: PlayerSummary[] }
}

interface OwnedGame {
  appid: number
  name: string
  playtime_forever: number
}

interface OwnedGamesResponse {
  response: { game_count?: number; games?: OwnedGame[] }
}

interface FriendListResponse {
  friendslist?: { friends: unknown[] }
}

interface PlayerLevelResponse {
  response: { player_level?: number }
}

function isSteamKeyError(error: unknown) {
  return error instanceof Error && (error.message.includes("403") || error.message.includes("401"))
}

function formatHours(minutes: number, t: TFunction) {
  return t(($) => $.commands.steam.hoursPlayed, { hours: (minutes / 60).toFixed(1) })
}

async function steamGet<T>(path: string, key: string) {
  return fetchJson<T>(`${API_BASE}${path}${path.includes("?") ? "&" : "?"}key=${key}`)
}

export const steamCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("steam")
    .setDescription("Show information for a Steam profile")
    .addStringOption((option) =>
      option.setName("query").setDescription("Custom name, profile URL or SteamID").setRequired(true),
    ),
  async execute(context) {
    const { env, interaction, t, locale } = context
    const raw = getStringOption(interaction, "query")
    const parsed = raw ? parseSteamInput(raw) : null
    if (!parsed) {
      return {
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              color: ERROR_COLOR,
              description: t(($) => $.commands.steam.invalidInput),
            },
          ],
        },
      }
    }
    const key = env.STEAM_API_KEY
    if (!key) {
      return {
        type: 4,
        data: {
          flags: 64,
          embeds: [{ color: ERROR_COLOR, description: t(($) => $.commands.steam.keyMissing) }],
        },
      }
    }

    return runDeferred(context, async () => {
      let steamId: string
      try {
        if (parsed.kind === "id64") {
          steamId = parsed.id
        } else {
          const resolved = await fetchJson<ResolveVanityResponse>(
            `${API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(parsed.name)}`,
          )
          if (resolved.response.success !== 1 || !resolved.response.steamid) {
            return {
              embeds: [
                {
                  color: ERROR_COLOR,
                  description: t(($) => $.commands.steam.notFound, { query: parsed.name }),
                },
              ],
            }
          }
          steamId = resolved.response.steamid
        }

        const player = (
          await steamGet<PlayerSummariesResponse>(`/ISteamUser/GetPlayerSummaries/v0002/?steamids=${steamId}`, key)
        ).response.players[0]
        if (!player) {
          return {
            embeds: [
              {
                color: ERROR_COLOR,
                description: t(($) => $.commands.steam.notFound, { query: raw ?? "" }),
              },
            ],
          }
        }

        const [owned, friends, level] = await Promise.all([
          steamGet<OwnedGamesResponse>(
            `/IPlayerService/GetOwnedGames/v0001/?steamid=${steamId}&include_appinfo=1&include_played_free_games=1`,
            key,
          ).catch(() => null),
          steamGet<FriendListResponse>(
            `/ISteamUser/GetFriendList/v0001/?steamid=${steamId}&relationship=friend`,
            key,
          ).catch(() => null),
          steamGet<PlayerLevelResponse>(`/IPlayerService/GetSteamLevel/v1/?steamid=${steamId}`, key).catch(() => null),
        ])

        const fields: APIEmbedField[] = [
          { name: t(($) => $.commands.steam.name), value: player.personaname, inline: true },
          {
            name: t(($) => $.commands.steam.level),
            value:
              level?.response.player_level != null
                ? String(level.response.player_level)
                : t(($) => $.common.notAvailable),
            inline: true,
          },
          {
            name: t(($) => $.commands.steam.friends),
            value: friends?.friendslist
              ? String(friends.friendslist.friends.length)
              : t(($) => $.commands.steam.private),
            inline: true,
          },
          {
            name: t(($) => $.commands.steam.gamesPlayed),
            value:
              owned?.response.game_count != null ? String(owned.response.game_count) : t(($) => $.common.notAvailable),
            inline: true,
          },
        ]

        if (player.gameextrainfo) {
          fields.push({ name: t(($) => $.commands.steam.playing), value: player.gameextrainfo, inline: true })
          const current = owned?.response.games?.find((game) => String(game.appid) === player.gameid)
          if (current) {
            fields.push({
              name: t(($) => $.commands.steam.hoursInGame),
              value: formatHours(current.playtime_forever, t),
              inline: true,
            })
          }
        }

        fields.push({
          name: t(($) => $.commands.steam.country),
          value: player.loccountrycode ? getCountryName(player.loccountrycode, locale) : t(($) => $.common.unknown),
          inline: true,
        })
        if (player.timecreated) {
          fields.push({
            name: t(($) => $.commands.steam.accountCreated),
            value: formatUnixTimestamp(player.timecreated, locale),
            inline: true,
          })
        }

        const embed: APIEmbed = {
          color: colorByStatus(player.personastate),
          author: { name: t(($) => $.commands.steam.author, { player: player.personaname }) },
          thumbnail: { url: player.avatarfull },
          fields,
        }
        if (player.lastlogoff) {
          embed.footer = {
            text: t(($) => $.commands.steam.lastOnline, { date: formatUnixTimestamp(player.lastlogoff, locale) }),
          }
        }
        return { embeds: [embed] }
      } catch (error) {
        if (isSteamKeyError(error)) {
          return {
            embeds: [
              {
                color: ERROR_COLOR,
                description: t(($) => $.commands.steam.keyInvalid),
              },
            ],
          }
        }
        throw error
      }
    })
  },
}
