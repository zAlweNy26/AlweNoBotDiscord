import { type APIEmbed, type APIEmbedField, SlashCommandBuilder } from "discord.js";
import { colorByStatus } from "../lib/colors";
import { getCountryName } from "../lib/countries";
import { formatUnixTimestamp } from "../lib/format";
import { fetchJson } from "../lib/http";
import { parseSteamInput } from "../lib/steam";
import { ERROR_COLOR } from "../respond";
import { runDeferred } from "./deferred";
import { getStringOption } from "./options";
import type { Command } from "./types";

const API_BASE = "https://api.steampowered.com";

interface ResolveVanityResponse {
  response: { steamid?: string; success: number; message?: string };
}

interface PlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  personastate: number;
  loccountrycode?: string;
  timecreated?: number;
  lastlogoff?: number;
  gameextrainfo?: string;
  gameid?: string;
}

interface PlayerSummariesResponse {
  response: { players: PlayerSummary[] };
}

interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
}

interface OwnedGamesResponse {
  response: { game_count?: number; games?: OwnedGame[] };
}

interface FriendListResponse {
  friendslist?: { friends: unknown[] };
}

interface PlayerLevelResponse {
  response: { player_level?: number };
}

function isSteamKeyError(error: unknown): boolean {
  return error instanceof Error && (error.message.includes("403") || error.message.includes("401"));
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} ore`;
}

async function steamGet<T>(path: string, key: string): Promise<T> {
  return fetchJson<T>(`${API_BASE}${path}${path.includes("?") ? "&" : "?"}key=${key}`);
}

export const steamCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("steam")
    .setDescription("Mostra le informazioni di un profilo Steam")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Nome personalizzato, URL del profilo o SteamID")
        .setRequired(true),
    ),
  async execute(context) {
    const { env, interaction } = context;
    const raw = getStringOption(interaction, "query");
    const parsed = raw ? parseSteamInput(raw) : null;
    if (!parsed) {
      return {
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              color: ERROR_COLOR,
              description:
                "Specifica un nome personalizzato, un URL del profilo o uno SteamID valido.",
            },
          ],
        },
      };
    }
    const key = env.STEAM_API_KEY;
    if (!key) {
      return {
        type: 4,
        data: {
          flags: 64,
          embeds: [{ color: ERROR_COLOR, description: "🔑 Chiave API di Steam non configurata." }],
        },
      };
    }

    return runDeferred(context, async () => {
      let steamId: string;
      try {
        if (parsed.kind === "id64") {
          steamId = parsed.id;
        } else {
          const resolved = await fetchJson<ResolveVanityResponse>(
            `${API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(parsed.name)}`,
          );
          if (resolved.response.success !== 1 || !resolved.response.steamid) {
            return {
              embeds: [
                {
                  color: ERROR_COLOR,
                  description: `❌ Nessun profilo Steam trovato per **${parsed.name}**.`,
                },
              ],
            };
          }
          steamId = resolved.response.steamid;
        }

        const player = (
          await steamGet<PlayerSummariesResponse>(
            `/ISteamUser/GetPlayerSummaries/v0002/?steamids=${steamId}`,
            key,
          )
        ).response.players[0];
        if (!player) {
          return {
            embeds: [
              {
                color: ERROR_COLOR,
                description: `❌ Nessun profilo Steam trovato per **${raw}**.`,
              },
            ],
          };
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
          steamGet<PlayerLevelResponse>(
            `/IPlayerService/GetSteamLevel/v1/?steamid=${steamId}`,
            key,
          ).catch(() => null),
        ]);

        const fields: APIEmbedField[] = [
          { name: "Nome", value: player.personaname, inline: true },
          {
            name: "Livello",
            value:
              level?.response.player_level != null ? String(level.response.player_level) : "n/d",
            inline: true,
          },
          {
            name: "Amici",
            value: friends?.friendslist ? String(friends.friendslist.friends.length) : "Privati",
            inline: true,
          },
          {
            name: "Giochi giocati",
            value: owned?.response.game_count != null ? String(owned.response.game_count) : "n/d",
            inline: true,
          },
        ];

        if (player.gameextrainfo) {
          fields.push({ name: "In gioco", value: player.gameextrainfo, inline: true });
          const current = owned?.response.games?.find(
            (game) => String(game.appid) === player.gameid,
          );
          if (current) {
            fields.push({
              name: "Ore nel gioco",
              value: formatHours(current.playtime_forever),
              inline: true,
            });
          }
        }

        fields.push({
          name: "Provenienza",
          value: player.loccountrycode ? getCountryName(player.loccountrycode) : "Sconosciuta",
          inline: true,
        });
        if (player.timecreated) {
          fields.push({
            name: "Account creato il",
            value: formatUnixTimestamp(player.timecreated),
            inline: true,
          });
        }

        const embed: APIEmbed = {
          color: colorByStatus(player.personastate),
          author: { name: `Informazioni su ${player.personaname}` },
          thumbnail: { url: player.avatarfull },
          fields,
        };
        if (player.lastlogoff) {
          embed.footer = { text: `Ultimo accesso: ${formatUnixTimestamp(player.lastlogoff)}` };
        }
        return { embeds: [embed] };
      } catch (error) {
        if (isSteamKeyError(error)) {
          return {
            embeds: [
              {
                color: ERROR_COLOR,
                description: "🔑 Chiave API di Steam non valida o non configurata.",
              },
            ],
          };
        }
        throw error;
      }
    });
  },
};
