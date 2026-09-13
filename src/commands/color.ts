import { SlashCommandBuilder } from "@discordjs/builders";
import convert from "color-convert";
import { embedResponse, ephemeralError } from "../respond";
import { getStringOption } from "./options";
import type { Command } from "./types";

type Format = "hex" | "rgb" | "hsl" | "hsv" | "xyz" | "hcg";
type Rgb = [number, number, number];

function parseValues(raw: string): Rgb | null {
  const values = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return values as Rgb;
}

function toRgb(format: Format, raw: string): Rgb | null {
  if (format === "hex") {
    const hex = raw.replace(/^#/, "");
    if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) {
      return null;
    }
    return convert.hex.rgb(
      hex.length === 3
        ? hex
            .split("")
            .map((char) => char + char)
            .join("")
        : hex,
    ) as Rgb;
  }

  const values = parseValues(raw);
  if (!values) {
    return null;
  }
  const [a, b, c] = values;

  switch (format) {
    case "rgb":
      if (values.some((value) => value < 0 || value > 255)) return null;
      return [Math.round(a), Math.round(b), Math.round(c)];
    case "hsl":
      if (a < 0 || a > 360 || b < 0 || b > 100 || c < 0 || c > 100) return null;
      return convert.hsl.rgb([a, b, c]) as Rgb;
    case "hsv":
      if (a < 0 || a > 360 || b < 0 || b > 100 || c < 0 || c > 100) return null;
      return convert.hsv.rgb([a, b, c]) as Rgb;
    case "xyz":
      if (values.some((value) => value < 0)) return null;
      return convert.xyz.rgb([a, b, c]) as Rgb;
    case "hcg":
      if (a < 0 || a > 360 || b < 0 || b > 100 || c < 0 || c > 100) return null;
      return convert.hcg.rgb([a, b, c]) as Rgb;
  }
}

export const colorCommand: Command = {
  category: "Misc",
  data: new SlashCommandBuilder()
    .setName("color")
    .setDescription("Converte un colore tra i vari formati")
    .addStringOption((option) =>
      option
        .setName("formato")
        .setDescription("Formato del valore inserito")
        .setRequired(true)
        .addChoices(
          { name: "HEX", value: "hex" },
          { name: "RGB", value: "rgb" },
          { name: "HSL", value: "hsl" },
          { name: "HSV", value: "hsv" },
          { name: "XYZ", value: "xyz" },
          { name: "HCG", value: "hcg" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("valore")
        .setDescription("Valore da convertire (es. ff0000, 255,0,0, 0,100,50)")
        .setRequired(true),
    ),
  execute({ interaction }) {
    const format = getStringOption(interaction, "formato") as Format | undefined;
    const raw = getStringOption(interaction, "valore");
    if (!format || raw === undefined) {
      return ephemeralError("Specifica il formato e il valore da convertire.");
    }

    let rgb: Rgb | null = null;
    try {
      rgb = toRgb(format, raw);
    } catch {
      rgb = null;
    }
    if (!rgb) {
      return ephemeralError(
        "Valore non valido. Esempi: hex `ff0000`, rgb `255, 0, 0`, hsl `0, 100, 50`, hsv `0, 100, 100`, xyz `41.24, 21.26, 1.93`, hcg `0, 100, 100`.",
      );
    }

    const hex = convert.rgb.hex(rgb) as string;
    const [h, s, l] = convert.rgb.hsl(rgb) as Rgb;
    const [hsvH, hsvS, hsvV] = convert.rgb.hsv(rgb) as Rgb;
    const [hcgH, hcgC, hcgG] = convert.rgb.hcg(rgb) as Rgb;

    return embedResponse({
      color: Number.parseInt(hex, 16),
      title: "🎨 Colore",
      fields: [
        { name: "HEX", value: `#${hex}`, inline: true },
        { name: "RGB", value: `${rgb.join(", ")}`, inline: true },
        {
          name: "HSL",
          value: `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`,
          inline: true,
        },
        {
          name: "HSV",
          value: `${Math.round(hsvH)}°, ${Math.round(hsvS)}%, ${Math.round(hsvV)}%`,
          inline: true,
        },
        {
          name: "XYZ",
          value: (convert.rgb.xyz(rgb) as Rgb).map((value) => value.toFixed(2)).join(", "),
          inline: true,
        },
        {
          name: "HCG",
          value: `${Math.round(hcgH)}°, ${Math.round(hcgC)}%, ${Math.round(hcgG)}%`,
          inline: true,
        },
      ],
    });
  },
};
