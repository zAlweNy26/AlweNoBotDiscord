import { type APIMessage, PermissionFlagsBits, Routes, SlashCommandBuilder } from "discord.js"
import { permissionErrorMessage } from "../lib/discord-errors"
import { ERROR_COLOR, ephemeralError, SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getIntegerOption } from "./options"
import type { Command } from "./types"

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export const clearCommand: Command = {
  category: "Mod",
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete the most recent messages in the channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),
  execute(context) {
    const { rest, interaction, t, locale } = context
    if (!interaction.guild_id) {
      return ephemeralError(t(($) => $.common.guildOnly))
    }
    const permissionError = permissionErrorMessage(
      t,
      locale,
      interaction,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ReadMessageHistory,
    )
    if (permissionError) {
      return ephemeralError(permissionError)
    }
    const amount = getIntegerOption(interaction, "amount")
    if (amount === undefined) {
      return ephemeralError(t(($) => $.commands.clear.amountRequired))
    }
    return runDeferred(
      context,
      async () => {
        const ids = (
          (await rest.get(Routes.channelMessages(interaction.channel_id), {
            query: new URLSearchParams({ limit: String(amount) }),
          })) as APIMessage[]
        )
          .filter((message) => Date.now() - Date.parse(message.timestamp) < TWO_WEEKS_MS)
          .map((message) => message.id)
        if (ids.length === 0) {
          return { embeds: [{ color: ERROR_COLOR, description: t(($) => $.commands.clear.noRecent) }] }
        }
        const [onlyId] = ids
        if (ids.length === 1 && onlyId) {
          await rest.delete(Routes.channelMessage(interaction.channel_id, onlyId))
        } else {
          await rest.post(Routes.channelBulkDelete(interaction.channel_id), {
            body: { messages: ids },
          })
        }
        return {
          embeds: [{ color: SUCCESS_COLOR, description: t(($) => $.commands.clear.deleted, { count: ids.length }) }],
        }
      },
      true,
    )
  },
}
