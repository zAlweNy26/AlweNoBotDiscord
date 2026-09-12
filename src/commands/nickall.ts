import { SlashCommandBuilder } from "@discordjs/builders";
import type { APIGuild, APIGuildMember } from "discord-api-types/v10";
import { PermissionFlagsBits, Routes } from "discord-api-types/v10";
import { ephemeralError, SUCCESS_COLOR } from "../respond";
import { runDeferred } from "./deferred";
import { getStringOption } from "./options";
import type { Command } from "./types";

export const nickallCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("nickall")
    .setDescription("Cambia il nickname a tutti i membri del server (solo proprietario)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription(
          "Nickname da impostare ({{username}} = nome utente). Se omesso, resetta i nickname.",
        ),
    ),
  async execute(context) {
    const { rest, interaction } = context;
    if (!interaction.guild_id) {
      return ephemeralError("Questo comando può essere usato solo in un server.");
    }
    const guildId = interaction.guild_id;
    const guild = (await rest.get(Routes.guild(guildId))) as APIGuild;
    if (interaction.user?.id !== guild.owner_id) {
      return ephemeralError("⛔ ***Non sei il proprietario di questo server!***");
    }
    const nickname = getStringOption(interaction, "nickname");
    return runDeferred(context, async () => {
      let renamed = 0;
      let failed = 0;
      let after: string | undefined;
      for (;;) {
        const query = new URLSearchParams({ limit: "1000" });
        if (after) {
          query.set("after", after);
        }
        const members = (await rest.get(Routes.guildMembers(guildId), {
          query,
        })) as APIGuildMember[];
        if (members.length === 0) {
          break;
        }
        for (const member of members) {
          if (member.user.id === guild.owner_id) {
            continue;
          }
          const nick = nickname
            ? nickname.replaceAll("{{username}}", member.user.username)
            : member.user.username;
          try {
            await rest.patch(Routes.guildMember(guildId, member.user.id), {
              body: { nick: nick.slice(0, 32) },
            });
            renamed += 1;
          } catch {
            failed += 1;
          }
        }
        const last = members.at(-1);
        if (!last || members.length < 1000) {
          break;
        }
        after = last.user.id;
      }
      const description =
        failed > 0
          ? `✅ ***Nicknames cambiati!*** ${renamed} aggiornati, ${failed} non modificabili.`
          : `✅ ***Nicknames cambiati con successo!*** ${renamed} aggiornati.`;
      return { embeds: [{ color: SUCCESS_COLOR, description }] };
    });
  },
};
