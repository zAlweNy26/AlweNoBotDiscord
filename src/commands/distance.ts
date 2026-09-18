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
// so only the FOSSGIS instance and its routed-* prefixes can honour "walk".
const OSRM_BASE = "https://routing.openstreetmap.de"
const USER_AGENT = "AlweNoBot (+https://discord.danyalwe.me)"

function error(description: string) {
  return { embeds: [{ color: ERROR_COLOR, description }] }
}

function geocode(place: string, locale: string) {
  return fetchJson<GeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=${locale}&format=json`,
  ).then((response) => response.results?.[0])
}

function describePlace(place: GeocodingResult) {
  return [place.name, place.admin1, place.country].filter((part): part is string => Boolean(part)).join(", ")
}

export const distanceCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("distance")
    .setDescription("Calculate distance and travel time between two places")
    .addStringOption((option) => option.setName("from").setDescription("Starting place").setRequired(true))
    .addStringOption((option) => option.setName("to").setDescription("Destination place").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Travel mode (default: car)")
        .addChoices({ name: "Car", value: "car" }, { name: "Walking", value: "walk" }),
    ),
  execute(context) {
    return runDeferred(context, async () => {
      const { t, locale } = context
      const from = getStringOption(context.interaction, "from") ?? ""
      const to = getStringOption(context.interaction, "to") ?? ""
      const walking = getStringOption(context.interaction, "mode") === "walk"

      let origin: GeocodingResult | undefined
      let destination: GeocodingResult | undefined
      try {
        const located = await Promise.all([geocode(from, locale), geocode(to, locale)])
        origin = located[0]
        destination = located[1]
      } catch (geocodingError) {
        console.error("Geocoding request failed", geocodingError)
        return error(t(($) => $.commands.distance.serviceUnavailable))
      }

      if (!origin) return error(t(($) => $.commands.distance.noResults, { place: from }))
      if (!destination) return error(t(($) => $.commands.distance.noResults, { place: to }))

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
        return error(t(($) => $.commands.distance.serviceUnavailable))
      }

      const route = data.code === "Ok" ? data.routes?.[0] : undefined
      if (route?.distance === undefined || route.duration === undefined) {
        return error(t(($) => $.commands.distance.noRoute))
      }

      const fields: APIEmbedField[] = [
        { name: t(($) => $.commands.distance.distance), value: formatRouteDistance(route.distance), inline: true },
        {
          name: t(($) => $.commands.distance.duration),
          value: formatRouteDuration(route.duration, t),
          inline: true,
        },
        {
          name: t(($) => $.commands.distance.mode),
          value: walking ? t(($) => $.commands.distance.modeWalking) : t(($) => $.commands.distance.modeCar),
          inline: true,
        },
        { name: t(($) => $.commands.distance.from), value: describePlace(origin) },
        { name: t(($) => $.commands.distance.to), value: describePlace(destination) },
      ]

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            title: `🗺️ ${from} → ${to}`,
            fields,
            footer: { text: t(($) => $.commands.distance.footer) },
          },
        ],
      }
    })
  },
}
