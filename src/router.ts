import type { REST } from "@discordjs/rest";
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  APIMessageComponentInteraction,
} from "discord-api-types/v10";
import { InteractionResponseType, InteractionType } from "discord-api-types/v10";
import { commandMap } from "./commands";
import { handleRoleButton } from "./commands/reactionrole";
import { ephemeralError } from "./respond";

export interface RouterContext {
  env: Env;
  rest: REST;
  waitUntil: (promise: Promise<unknown>) => void;
}

export async function routeInteraction(
  interaction: APIInteraction,
  context: RouterContext,
): Promise<APIInteractionResponse> {
  switch (interaction.type) {
    case InteractionType.Ping:
      return { type: InteractionResponseType.Pong };

    case InteractionType.ApplicationCommand: {
      const command = commandMap.get(interaction.data.name);
      if (!command) {
        return ephemeralError("Comando sconosciuto.");
      }
      if (command.ownerOnly && interaction.user?.id !== context.env.OWNER_ID) {
        return ephemeralError("Questo comando è riservato al proprietario del bot.");
      }
      return command.execute({
        ...context,
        interaction: interaction as APIChatInputApplicationCommandInteraction,
      });
    }

    case InteractionType.MessageComponent:
      return handleRoleButton(context, interaction as APIMessageComponentInteraction);
    default:
      return ephemeralError("Tipo di interazione non supportato.");
  }
}
