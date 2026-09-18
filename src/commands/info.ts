import { type APIEmbedField, SlashCommandBuilder } from "discord.js"
import { userAvatarUrl } from "../lib/discord"
import { formatDate, snowflakeToDate } from "../lib/format"
import { embedResponse, ephemeralError, SUCCESS_COLOR } from "../respond"
import { getUserOption } from "./options"
import type { Command } from "./types"

export const infoCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Show information about a user")
    .addUserOption((option) => option.setName("user").setDescription("User to show information about")),
  execute({ interaction, t, locale }) {
    const target = getUserOption(interaction, "user")
    const user = target?.user ?? interaction.user
    if (!user) {
      return ephemeralError(t(($) => $.commands.info.userNotFound))
    }
    const member = target?.member ?? interaction.member
    const fields: APIEmbedField[] = [
      { name: t(($) => $.commands.info.name), value: user.global_name ?? user.username, inline: true },
      { name: t(($) => $.commands.info.username), value: `@${user.username}`, inline: true },
      { name: t(($) => $.commands.info.id), value: user.id, inline: true },
      { name: t(($) => $.commands.info.nickname), value: member?.nick ?? t(($) => $.commands.info.none), inline: true },
      {
        name: t(($) => $.commands.info.accountCreated),
        value: formatDate(snowflakeToDate(user.id), false, locale),
        inline: true,
      },
    ]
    if (member?.joined_at) {
      fields.push({
        name: t(($) => $.commands.info.joined),
        value: formatDate(new Date(member.joined_at), false, locale),
        inline: true,
      })
    }
    if (member?.roles) {
      fields.push({ name: t(($) => $.commands.info.roles), value: String(member.roles.length), inline: true })
    }
    const avatar = userAvatarUrl(user)
    return embedResponse({
      color: SUCCESS_COLOR,
      title: user.global_name ?? user.username,
      thumbnail: avatar ? { url: avatar } : undefined,
      fields,
    })
  },
}
