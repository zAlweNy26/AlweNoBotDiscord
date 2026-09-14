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
import { ephemeralError } from "./respond"

export async function routeInteraction(
  interaction: APIInteraction,
  context: {
    env: Env
    rest: REST
    waitUntil: (promise: Promise<unknown>) => void
  },
) {
  switch (interaction.type) {
    case InteractionType.Ping:
      return { type: InteractionResponseType.Pong }

    case InteractionType.ApplicationCommand: {
      const command = commandMap.get(interaction.data.name)
      if (!command) {
        return ephemeralError("Comando sconosciuto.")
      }
      // Discord sends the invoker as `member.user` in guilds and as `user` only in DMs.
      const invokerId = interaction.member?.user.id ?? interaction.user?.id
      if (command.ownerOnly && invokerId !== context.env.OWNER_ID) {
        return ephemeralError("Questo comando è riservato al proprietario del bot.")
      }
      return command.execute({
        ...context,
        interaction: interaction as APIChatInputApplicationCommandInteraction,
      })
    }

    case InteractionType.MessageComponent:
      return handleRoleButton(context, interaction as APIMessageComponentInteraction)
    default:
      return ephemeralError("Tipo di interazione non supportato.")
  }
}
