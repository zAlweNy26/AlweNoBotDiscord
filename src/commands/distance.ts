import { type APIEmbedField, SlashCommandBuilder } from "discord.js"
import { fetchJson } from "../lib/http"
import { formatRouteDistance, formatRouteDuration } from "../lib/route"
import { ERROR_COLOR, SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getStringOption } from "./options"
import type { Command } from "./types"

interface GeocodingResult {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

interface GeocodingResponse {
  results?: GeocodingResult[]
}

interface OsrmResponse {
  code?: string
  routes?: { distance?: number; duration?: number }[]
}

// The router.project-osrm.org demo host ignores the profile in the path and always routes by car,
// so only the FOSSGIS instance and its routed-* prefixes can honour "piedi".
const OSRM_BASE = "https://routing.openstreetmap.de"
const USER_AGENT = "AlweNoBot (+https://discord.danyalwe.me)"

function error(description: string) {
  return { embeds: [{ color: ERROR_COLOR, description }] }
}

function geocode(place: string) {
  return fetchJson<GeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=it&format=json`,
  ).then((response) => response.results?.[0])
}

function describePlace(place: GeocodingResult) {
  return [place.name, place.admin1, place.country].filter((part): part is string => Boolean(part)).join(", ")
}

export const distanceCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("distance")
    .setDescription("Calcola distanza e tempo di percorrenza tra due località")
    .addStringOption((option) => option.setName("partenza").setDescription("Località di partenza").setRequired(true))
    .addStringOption((option) =>
      option.setName("destinazione").setDescription("Località di destinazione").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("mezzo")
        .setDescription("Mezzo di trasporto (predefinito: auto)")
        .addChoices({ name: "Auto", value: "auto" }, { name: "A piedi", value: "piedi" }),
    ),
  execute(context) {
    return runDeferred(context, async () => {
      const from = getStringOption(context.interaction, "partenza") ?? ""
      const to = getStringOption(context.interaction, "destinazione") ?? ""
      const walking = getStringOption(context.interaction, "mezzo") === "piedi"

      let origin: GeocodingResult | undefined
      let destination: GeocodingResult | undefined
      try {
        const located = await Promise.all([geocode(from), geocode(to)])
        origin = located[0]
        destination = located[1]
      } catch (geocodingError) {
        console.error("Geocoding request failed", geocodingError)
        return error("Servizio momentaneamente non disponibile, riprova più tardi.")
      }

      if (!origin) return error(`Nessun risultato per **${from}**.`)
      if (!destination) return error(`Nessun risultato per **${to}**.`)

      let data: OsrmResponse
      try {
        data = await fetchJson<OsrmResponse>(
          `${OSRM_BASE}/${walking ? "routed-foot" : "routed-car"}/route/v1/driving/` +
            `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
            "?overview=false",
          { headers: { "User-Agent": USER_AGENT } },
        )
      } catch (routingError) {
        console.error("OSRM request failed", routingError)
        return error("Servizio momentaneamente non disponibile, riprova più tardi.")
      }

      const route = data.code === "Ok" ? data.routes?.[0] : undefined
      if (route?.distance === undefined || route.duration === undefined) {
        return error("Nessun percorso trovato per le località indicate.")
      }

      const fields: APIEmbedField[] = [
        { name: "Distanza", value: formatRouteDistance(route.distance), inline: true },
        { name: "Durata stimata", value: formatRouteDuration(route.duration), inline: true },
        { name: "Mezzo usato", value: walking ? "A piedi" : "Auto", inline: true },
        { name: "Partenza", value: describePlace(origin) },
        { name: "Destinazione", value: describePlace(destination) },
      ]

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            title: `🗺️ ${from} → ${to}`,
            fields,
            footer: { text: "Percorso OSRM · dati © OpenStreetMap contributors" },
          },
        ],
      }
    })
  },
}
