import {
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
  type APIMessageComponentInteraction,
  InteractionResponseType,
  InteractionType,
  type REST,
} from "discord.js"
import { commandMap } from "./commands"
import { handleRoleButton } from "./commands/reactionrole"
import { discordErrorKey } from "./lib/discord-errors"
import { createTranslator, normalizeLocale } from "./lib/i18n"
import { ephemeralError } from "./respond"

export async function routeInteraction(
  interaction: APIInteraction,
  context: {
    env: Env
    rest: REST
    waitUntil: (promise: Promise<unknown>) => void
  },
) {
  const rawLocale = "locale" in interaction ? interaction.locale : undefined
  const t = createTranslator(rawLocale)
  const locale = normalizeLocale(rawLocale)

  try {
    switch (interaction.type) {
      case InteractionType.Ping:
        return { type: InteractionResponseType.Pong }

      case InteractionType.ApplicationCommand: {
        const command = commandMap.get(interaction.data.name)
        if (!command) {
          return ephemeralError(t(($) => $.router.unknownCommand))
        }
        // Discord sends the invoker as `member.user` in guilds and as `user` only in DMs.
        const invokerId = interaction.member?.user.id ?? interaction.user?.id
        if (command.ownerOnly && invokerId !== context.env.OWNER_ID) {
          return ephemeralError(t(($) => $.router.ownerOnly))
        }
        return await command.execute({
          ...context,
          t,
          locale,
          interaction: interaction as APIChatInputApplicationCommandInteraction,
        })
      }

      case InteractionType.MessageComponent:
        return await handleRoleButton({ ...context, t, locale }, interaction as APIMessageComponentInteraction)
      default:
        return ephemeralError(t(($) => $.router.unsupported))
    }
  } catch (error) {
    const name = interaction.type === InteractionType.ApplicationCommand ? interaction.data.name : undefined
    console.error(name ? `Command ${name} failed` : "Interaction routing failed", error)
    const key = discordErrorKey(error)
    return ephemeralError(key ? t(($) => $.errors[key]) : t(($) => $.common.interactionError))
  }
}
