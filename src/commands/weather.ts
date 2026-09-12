import { SlashCommandBuilder } from "@discordjs/builders";
import type { APIEmbedField } from "discord-api-types/v10";
import { fetchJson } from "../lib/http";
import { describeWeatherCode } from "../lib/weather";
import { ERROR_COLOR, SUCCESS_COLOR } from "../respond";
import { runDeferred } from "./deferred";
import { getStringOption } from "./options";
import type { Command } from "./types";

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface ForecastResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

export const weatherCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Mostra il meteo attuale per una località")
    .addStringOption((option) =>
      option.setName("luogo").setDescription("Città o località").setRequired(true),
    ),
  category: "Misc",
  execute: (context) =>
    runDeferred(context, async () => {
      const place = getStringOption(context.interaction, "luogo") ?? "";

      const geocoding = await fetchJson<GeocodingResponse>(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=it&format=json`,
      );
      const location = geocoding.results?.[0];
      if (!location) {
        return {
          embeds: [{ color: ERROR_COLOR, description: `Nessun risultato per **${place}**.` }],
        };
      }

      const forecast = await fetchJson<ForecastResponse>(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
      );
      const current = forecast.current;

      const fields: APIEmbedField[] = [
        { name: "Coordinate", value: `${location.latitude}, ${location.longitude}`, inline: true },
        { name: "Fuso orario", value: forecast.timezone, inline: true },
        { name: "Temperatura", value: `${current.temperature_2m} °C`, inline: true },
        { name: "Tempo", value: describeWeatherCode(current.weather_code), inline: true },
        { name: "Vento", value: `${current.wind_speed_10m} km/h`, inline: true },
        { name: "Umidità", value: `${current.relative_humidity_2m}%`, inline: true },
      ];

      const locationName = [location.name, location.admin1, location.country]
        .filter((part): part is string => Boolean(part))
        .join(", ");

      return {
        embeds: [
          {
            color: SUCCESS_COLOR,
            author: { name: `Info su ${locationName}` },
            fields,
          },
        ],
      };
    }),
};
