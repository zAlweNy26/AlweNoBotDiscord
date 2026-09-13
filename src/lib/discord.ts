import type { APIGuild, APIUser } from "discord.js";

const CDN_BASE = "https://cdn.discordapp.com";

function imageFormat(hash: string) {
  return hash.startsWith("a_") ? "gif" : "png";
}

export function userAvatarUrl(user: Pick<APIUser, "id" | "avatar">) {
  if (!user.avatar) return null;
  return `${CDN_BASE}/avatars/${user.id}/${user.avatar}.${imageFormat(user.avatar)}?size=4096`;
}

export function guildIconUrl(guild: Pick<APIGuild, "id" | "icon">) {
  if (!guild.icon) return null;
  return `${CDN_BASE}/icons/${guild.id}/${guild.icon}.${imageFormat(guild.icon)}?size=4096`;
}
