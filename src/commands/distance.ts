import { SlashCommandBuilder } from "@discordjs/builders";
import type { APIEmbed, APIEmbedField } from "discord-api-types/v10";
import { fetchJson } from "../lib/http";
import { ERROR_COLOR, SUCCESS_COLOR } from "../respond";
import { runDeferred } from "./deferred";
import { getStringOption } from "./options";
import type { Command } from "./types";

interface BingRoute {
  travelDistance?: number;
  travelDuration?: number;
  travelDurationTraffic?: number;
  routeLegs?: {
    startLocation?: { name?: string };
    endLocation?: { name?: string };
  }[];
}

interface BingResponse {
  resourceSets?: { resources?: BingRoute[] }[];
}

const TRAVEL_MODES: Record<string, string> = {
  auto: "Driving",
  piedi: "Walking",
};

const OPTIMIZATIONS: Record<string, string> = {
  tempo: "time",
  distanza: "distance",
};

function error(description: string): { embeds: APIEmbed[] } {
  return { embeds: [{ color: ERROR_COLOR, description }] };
}

export const distanceCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("distance")
    .setDescription("Calcola distanza e tempo di percorrenza tra due località")
    .addStringOption((option) =>
      option.setName("partenza").setDescription("Località di partenza").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("destinazione").setDescription("Località di destinazione").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("mezzo")
        .setDescription("Mezzo di trasporto (predefinito: auto)")
        .addChoices({ name: "Auto", value: "auto" }, { name: "A piedi", value: "piedi" }),
    )
    .addStringOption((option) =>
      option
        .setName("output")
        .setDescription("Cosa ottimizzare (predefinito: tempo)")
        .addChoices({ name: "Tempo", value: "tempo" }, { name: "Distanza", value: "distanza" }),
    ),
  execute(context) {
    return runDeferred(context, async () => {
      const key = context.env.BING_MAPS_KEY;
      if (!key) {
        return error("Chiave API di Bing Maps non configurata.");
      }

      const from = getStringOption(context.interaction, "partenza") ?? "";
      const to = getStringOption(context.interaction, "destinazione") ?? "";
      const mode =
        TRAVEL_MODES[getStringOption(context.interaction, "mezzo") ?? "auto"] ?? "Driving";

      let data: BingResponse;
      try {
        data = await fetchJson<BingResponse>(
          `https://dev.virtualearth.net/REST/V1/Routes/${mode}` +
            `?wp.0=${encodeURIComponent(from)}&wp.1=${encodeURIComponent(to)}` +
            `&optmz=${OPTIMIZATIONS[getStringOption(context.interaction, "output") ?? "tempo"] ?? "time"}&output=json&key=${encodeURIComponent(key)}`,
        );
      } catch (fetchError) {
        console.error("Bing Maps request failed", fetchError);
        return error("Servizio momentaneamente non disponibile, riprova più tardi.");
      }

      const route = data.resourceSets?.[0]?.resources?.[0];
      if (!route) {
        return error("Nessun percorso trovato per le località indicate.");
      }

      const legs = route.routeLegs?.[0];
      const fields: APIEmbedField[] = [
        { name: "Distanza", value: `${route.travelDistance ?? 0} km`, inline: true },
        { name: "Durata stimata", value: `${route.travelDuration ?? 0} min`, inline: true },
      ];
      if (route.travelDurationTraffic !== undefined) {
        fields.push({
          name: "Durata con traffico",
          value: `${route.travelDurationTraffic} min`,
          inline: true,
        });
      }
      fields.push({
        name: "Mezzo usato",
        value: mode === "Walking" ? "A piedi" : "Auto",
        inline: true,
      });
      if (legs?.startLocation?.name) {
        fields.push({ name: "Partenza", value: legs.startLocation.name });
      }
      if (legs?.endLocation?.name) {
        fields.push({ name: "Destinazione", value: legs.endLocation.name });
      }

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            title: `🗺️ ${from} → ${to}`,
            fields,
          },
        ],
      };
    });
  },
};
