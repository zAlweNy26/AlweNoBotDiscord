import {
  ActionRowBuilder,
  type APIMessage,
  type APIMessageComponentInteraction,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  type REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js"
import type { TFunction } from "i18next"
import { addRoleButton, deleteRoleButtonsForMessage, getRoleButton } from "../db"
import { permissionErrorMessage } from "../lib/discord-errors"
import { ERROR_COLOR, ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond"
import { getSubOption } from "./options"
import type { Command } from "./types"

const CUSTOM_ID_PREFIX = "role:"

function messageIdFromInput(input: string) {
  return /(\d{17,20})/.exec(input.trim())?.[1] ?? null
}

export async function handleRoleButton(
  context: { env: Env; rest: REST; t: TFunction; locale: string },
  interaction: APIMessageComponentInteraction,
) {
  const customId = interaction.data.custom_id
  if (!customId.startsWith(CUSTOM_ID_PREFIX)) {
    return ephemeralError(context.t(($) => $.commands.reactionrole.unknownButton))
  }
  const roleId = customId.slice(CUSTOM_ID_PREFIX.length)
  const guildId = interaction.guild_id
  if (!guildId) {
    return ephemeralError(context.t(($) => $.commands.reactionrole.buttonGuildOnly))
  }
  if (!(await getRoleButton(context.env.DB, interaction.message.id, roleId))) {
    return ephemeralError(context.t(($) => $.commands.reactionrole.inactive))
  }
  const userId = interaction.user?.id
  if (!userId) {
    return ephemeralError(context.t(($) => $.commands.reactionrole.noUser))
  }
  const permissionError = permissionErrorMessage(
    context.t,
    context.locale,
    interaction,
    PermissionFlagsBits.ManageRoles,
  )
  if (permissionError) {
    return ephemeralError(permissionError)
  }
  const hasRole = interaction.member?.roles.includes(roleId) ?? false
  try {
    if (hasRole) {
      await context.rest.delete(Routes.guildMemberRole(guildId, userId, roleId))
    } else {
      await context.rest.put(Routes.guildMemberRole(guildId, userId, roleId))
    }
  } catch {
    return ephemeralEmbed({
      color: ERROR_COLOR,
      description: context.t(($) => $.commands.reactionrole.cannotModify),
    })
  }
  return ephemeralEmbed({
    color: SUCCESS_COLOR,
    description: hasRole
      ? context.t(($) => $.commands.reactionrole.roleRemoved, { roleId })
      : context.t(($) => $.commands.reactionrole.roleAdded, { roleId }),
  })
}

export const reactionroleCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Create or remove button messages that grant roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Post a message with a button that grants a role")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to post in")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addRoleOption((option) => option.setName("role").setDescription("Role to grant").setRequired(true))
        .addStringOption((option) => option.setName("label").setDescription("Button label").setRequired(false)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Remove a message's button associations")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel of the message")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addStringOption((option) => option.setName("message").setDescription("Message ID or link").setRequired(true)),
    ),
  async execute(context) {
    const { env, interaction, t } = context
    const guildId = interaction.guild_id
    if (!guildId) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const subcommand = interaction.data.options?.[0]
    if (subcommand?.type !== ApplicationCommandOptionType.Subcommand) {
      return ephemeralError(t(($) => $.commands.reactionrole.invalidAction))
    }
    if (subcommand.name === "create") {
      const channelId = getSubOption(subcommand, "channel", ApplicationCommandOptionType.Channel)
      const roleId = getSubOption(subcommand, "role", ApplicationCommandOptionType.Role)
      if (typeof channelId !== "string" || typeof roleId !== "string") {
        return ephemeralError(t(($) => $.commands.reactionrole.missingArgs))
      }
      const rawLabel = getSubOption(subcommand, "label", ApplicationCommandOptionType.String)
      const label =
        (typeof rawLabel === "string" ? rawLabel : undefined) ??
        interaction.data.resolved?.roles?.[roleId]?.name ??
        t(($) => $.commands.reactionrole.defaultLabel)
      await addRoleButton(env.DB, {
        messageId: (
          (await context.rest.post(Routes.channelMessages(channelId), {
            body: {
              components: [
                new ActionRowBuilder<ButtonBuilder>()
                  .addComponents(
                    new ButtonBuilder()
                      .setCustomId(`${CUSTOM_ID_PREFIX}${roleId}`)
                      .setLabel(label)
                      .setStyle(ButtonStyle.Primary),
                  )
                  .toJSON(),
              ],
            },
          })) as APIMessage
        ).id,
        roleId,
        guildId,
        label,
        emoji: null,
      })
      return ephemeralEmbed({
        color: SUCCESS_COLOR,
        description: t(($) => $.commands.reactionrole.created, { channelId }),
      })
    }
    if (subcommand.name === "delete") {
      const rawMessage = getSubOption(subcommand, "message", ApplicationCommandOptionType.String)
      const messageId = typeof rawMessage === "string" ? messageIdFromInput(rawMessage) : null
      if (!messageId) {
        return ephemeralError(t(($) => $.commands.reactionrole.invalidMessage))
      }
      await deleteRoleButtonsForMessage(env.DB, messageId)
      return ephemeralEmbed({
        color: SUCCESS_COLOR,
        description: t(($) => $.commands.reactionrole.removed, { messageId }),
      })
    }
    return ephemeralError(t(($) => $.commands.reactionrole.invalidAction))
  },
}
