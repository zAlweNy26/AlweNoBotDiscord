import { SlashCommandBuilder } from "discord.js"
import { fetchJson } from "../lib/http"
import { weatherCodeKey } from "../lib/weather"
import { ERROR_COLOR, SUCCESS_COLOR } from "../respond"
import { runDeferred } from "./deferred"
import { getStringOption } from "./options"
import type { Command } from "./types"

interface GeocodingResult {
  name: string
  latitude: number
  longitude: number
  timezone: string
  country?: string
  admin1?: string
}

interface GeocodingResponse {
  results?: GeocodingResult[]
}

interface ForecastResponse {
  timezone: string
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    wind_speed_10m: number
    weather_code: number
  }
}

export const weatherCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Show the current weather for a place")
    .addStringOption((option) => option.setName("place").setDescription("City or place").setRequired(true)),
  category: "Misc",
  execute: (context) =>
    runDeferred(context, async () => {
      const { t, locale } = context
      const place = getStringOption(context.interaction, "place") ?? ""

      const location = (
        await fetchJson<GeocodingResponse>(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=${locale}&format=json`,
        )
      ).results?.[0]
      if (!location) {
        return {
          embeds: [{ color: ERROR_COLOR, description: t(($) => $.commands.weather.noResults, { place }) }],
        }
      }

      const forecast = await fetchJson<ForecastResponse>(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
      )
      const current = forecast.current

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            author: {
              name: t(($) => $.commands.weather.author, {
                place: [location.name, location.admin1, location.country]
                  .filter((part): part is string => Boolean(part))
                  .join(", "),
              }),
            },
            fields: [
              {
                name: t(($) => $.commands.weather.coordinates),
                value: `${location.latitude}, ${location.longitude}`,
                inline: true,
              },
              { name: t(($) => $.commands.weather.timeZone), value: forecast.timezone, inline: true },
              { name: t(($) => $.commands.weather.temperature), value: `${current.temperature_2m} °C`, inline: true },
              {
                name: t(($) => $.commands.weather.weather),
                value: t(($) => $.weather[weatherCodeKey(current.weather_code)]),
                inline: true,
              },
              { name: t(($) => $.commands.weather.wind), value: `${current.wind_speed_10m} km/h`, inline: true },
              { name: t(($) => $.commands.weather.humidity), value: `${current.relative_humidity_2m}%`, inline: true },
            ],
          },
        ],
      }
    }),
}
