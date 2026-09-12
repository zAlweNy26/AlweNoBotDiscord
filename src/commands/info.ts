import { SlashCommandBuilder } from "@discordjs/builders";
import type { APIEmbedField } from "discord-api-types/v10";
import { userAvatarUrl } from "../lib/discord";
import { formatDate, snowflakeToDate } from "../lib/format";
import { embedResponse, ephemeralError, SUCCESS_COLOR } from "../respond";
import { getUserOption } from "./options";
import type { Command } from "./types";

export const infoCommand: Command = {
  category: "Info",
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Mostra informazioni su un utente")
    .addUserOption((option) =>
      option.setName("utente").setDescription("Utente di cui mostrare le informazioni"),
    ),
  execute({ interaction }) {
    const target = getUserOption(interaction, "utente");
    const user = target?.user ?? interaction.user;
    if (!user) {
      return ephemeralError("Utente non trovato.");
    }
    const member = target?.member ?? interaction.member;
    const fields: APIEmbedField[] = [
      { name: "Nome", value: user.global_name ?? user.username, inline: true },
      { name: "Username", value: `@${user.username}`, inline: true },
      { name: "ID", value: user.id, inline: true },
      { name: "Nickname", value: member?.nick ?? "Nessuno", inline: true },
      {
        name: "Account creato il",
        value: formatDate(snowflakeToDate(user.id), false),
        inline: true,
      },
    ];
    if (member?.joined_at) {
      fields.push({
        name: "Entrato nel server",
        value: formatDate(new Date(member.joined_at), false),
        inline: true,
      });
    }
    if (member?.roles) {
      fields.push({ name: "Ruoli", value: String(member.roles.length), inline: true });
    }
    const avatar = userAvatarUrl(user);
    return embedResponse({
      color: SUCCESS_COLOR,
      title: user.global_name ?? user.username,
      thumbnail: avatar ? { url: avatar } : undefined,
      fields,
    });
  },
};
