import { ActionRowBuilder, ButtonBuilder, SlashCommandBuilder } from "@discordjs/builders";
import type { REST } from "@discordjs/rest";
import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIInteractionResponse,
  type APIMessage,
  type APIMessageComponentInteraction,
  ApplicationCommandOptionType,
  ButtonStyle,
  PermissionFlagsBits,
  Routes,
} from "discord-api-types/v10";
import { addRoleButton, deleteRoleButtonsForMessage, getRoleButton } from "../db";
import { ERROR_COLOR, ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond";
import type { Command } from "./types";

const CUSTOM_ID_PREFIX = "role:";

function messageIdFromInput(input: string): string | null {
  const match = /(\d{17,20})/.exec(input.trim());
  return match?.[1] ?? null;
}

function getSubOption(
  subcommand: APIApplicationCommandInteractionDataSubcommandOption,
  name: string,
  type: ApplicationCommandOptionType,
): string | undefined {
  const option = subcommand.options?.find(
    (candidate) => candidate.name === name && candidate.type === type,
  );
  if (!option || !("value" in option)) return undefined;
  return typeof option.value === "string" ? option.value : undefined;
}

export async function handleRoleButton(
  context: { env: Env; rest: REST },
  interaction: APIMessageComponentInteraction,
): Promise<APIInteractionResponse> {
  const customId = interaction.data.custom_id;
  if (!customId.startsWith(CUSTOM_ID_PREFIX)) {
    return ephemeralError("Pulsante non riconosciuto.");
  }
  const roleId = customId.slice(CUSTOM_ID_PREFIX.length);
  const guildId = interaction.guild_id;
  if (!guildId) {
    return ephemeralError("Questo pulsante può essere usato solo in un server.");
  }
  const mapping = await getRoleButton(context.env.DB, interaction.message.id, roleId);
  if (!mapping) {
    return ephemeralError("Questo pulsante non è più attivo.");
  }
  const userId = interaction.user?.id;
  if (!userId) {
    return ephemeralError("Impossibile identificare l'utente.");
  }
  const hasRole = interaction.member?.roles.includes(roleId) ?? false;
  try {
    if (hasRole) {
      await context.rest.delete(Routes.guildMemberRole(guildId, userId, roleId));
    } else {
      await context.rest.put(Routes.guildMemberRole(guildId, userId, roleId));
    }
  } catch {
    return ephemeralEmbed({
      color: ERROR_COLOR,
      description:
        "❌ Non posso modificare questo ruolo: controlla i permessi del bot e la gerarchia dei ruoli.",
    });
  }
  return ephemeralEmbed({
    color: SUCCESS_COLOR,
    description: hasRole ? `✅ Ruolo <@&${roleId}> rimosso.` : `✅ Ruolo <@&${roleId}> aggiunto.`,
  });
}

export const reactionroleCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Crea o rimuovi messaggi con pulsanti per assegnare ruoli")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Pubblica un messaggio con un pulsante che assegna un ruolo")
        .addChannelOption((option) =>
          option.setName("canale").setDescription("Canale in cui pubblicare").setRequired(true),
        )
        .addRoleOption((option) =>
          option.setName("ruolo").setDescription("Ruolo da assegnare").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("testo").setDescription("Testo del pulsante").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Rimuove le associazioni di un messaggio con pulsanti")
        .addChannelOption((option) =>
          option.setName("canale").setDescription("Canale del messaggio").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("messaggio").setDescription("ID o link del messaggio").setRequired(true),
        ),
    ),
  async execute(context) {
    const { env, interaction, rest } = context;
    const guildId = interaction.guild_id;
    if (!guildId) {
      return ephemeralError("Questo comando può essere usato solo in un server.");
    }
    const subcommand = interaction.data.options?.[0];
    if (subcommand?.type !== ApplicationCommandOptionType.Subcommand) {
      return ephemeralError("Azione non valida.");
    }
    if (subcommand.name === "create") {
      const channelId = getSubOption(subcommand, "canale", ApplicationCommandOptionType.Channel);
      const roleId = getSubOption(subcommand, "ruolo", ApplicationCommandOptionType.Role);
      if (!channelId || !roleId) {
        return ephemeralError("Specifica un canale e un ruolo.");
      }
      const label =
        getSubOption(subcommand, "testo", ApplicationCommandOptionType.String) ??
        interaction.data.resolved?.roles?.[roleId]?.name ??
        "Ruolo";
      const button = new ButtonBuilder()
        .setCustomId(`${CUSTOM_ID_PREFIX}${roleId}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
      const message = (await rest.post(Routes.channelMessages(channelId), {
        body: { components: [row.toJSON()] },
      })) as APIMessage;
      await addRoleButton(env.DB, {
        messageId: message.id,
        roleId,
        guildId,
        label,
        emoji: null,
      });
      return ephemeralEmbed({
        color: SUCCESS_COLOR,
        description: `✅ Pulsante creato in <#${channelId}>.`,
      });
    }
    if (subcommand.name === "delete") {
      const rawMessage = getSubOption(subcommand, "messaggio", ApplicationCommandOptionType.String);
      const messageId = rawMessage ? messageIdFromInput(rawMessage) : null;
      if (!messageId) {
        return ephemeralError("Specifica un ID o un link del messaggio valido.");
      }
      await deleteRoleButtonsForMessage(env.DB, messageId);
      return ephemeralEmbed({
        color: SUCCESS_COLOR,
        description: `🗑️ Associazioni rimosse per il messaggio **${messageId}**.`,
      });
    }
    return ephemeralError("Azione non valida.");
  },
};
