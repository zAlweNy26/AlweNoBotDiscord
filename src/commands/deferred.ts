import { type APIEmbed, Routes } from "discord.js";
import { deferredResponse, ERROR_COLOR } from "../respond";
import type { CommandContext } from "./types";

export interface DeferredBody {
  content?: string;
  embeds?: APIEmbed[];
}

export function runDeferred(context: CommandContext, work: () => Promise<DeferredBody>) {
  context.waitUntil(
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
        await context.rest.patch(
          Routes.webhookMessage(
            context.env.DISCORD_APPLICATION_ID,
            context.interaction.token,
            "@original",
          ),
          { body },
        );
      } catch (error) {
        console.error("Failed to edit the original interaction response", error);
      }
    })(),
  );

  return deferredResponse();
}
