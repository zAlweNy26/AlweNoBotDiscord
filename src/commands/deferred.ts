import type { APIEmbed, APIInteractionResponse } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";
import { deferredResponse, ERROR_COLOR } from "../respond";
import type { CommandContext } from "./types";

export interface DeferredBody {
  content?: string;
  embeds?: APIEmbed[];
}

export function runDeferred(
  context: CommandContext,
  work: () => Promise<DeferredBody>,
): APIInteractionResponse {
  const { env, rest, interaction, waitUntil } = context;

  waitUntil(
    (async () => {
      let body: DeferredBody;
      try {
        body = await work();
      } catch (error) {
        console.error("Deferred command failed", error);
        body = {
          embeds: [
            {
              color: ERROR_COLOR,
              description: "Si è verificato un errore durante l'esecuzione del comando.",
            },
          ],
        };
      }

      try {
        await rest.patch(
          Routes.webhookMessage(env.DISCORD_APPLICATION_ID, interaction.token, "@original"),
          { body },
        );
      } catch (error) {
        console.error("Failed to edit the original interaction response", error);
      }
    })(),
  );

  return deferredResponse();
}
