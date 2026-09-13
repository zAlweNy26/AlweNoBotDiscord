import { SlashCommandBuilder } from "@discordjs/builders";
import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import {
  DEFAULT_COUNTER_FORMAT,
  DEFAULT_FAREWELL_MESSAGE,
  DEFAULT_WELCOME_MESSAGE,
  ensureGuildSettings,
  type GuildSettingsPatch,
  updateGuildSettings,
} from "../db";
import { embedResponse, ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond";
import type { Command } from "./types";

interface ConfigSpec {
  name: "welcome" | "farewell" | "counter";
  description: string;
  label: string;
  enabledField: "welcomeEnabled" | "farewellEnabled" | "counterEnabled";
  channelField: "welcomeChannelId" | "farewellChannelId" | "counterChannelId";
  textField: "welcomeMessage" | "farewellMessage" | "counterFormat";
  textOptionName: "messaggio" | "formato";
  textDescription: string;
  defaultText: string;
}

function getSubcommand(
  interaction: Parameters<Command["execute"]>[0]["interaction"],
): APIApplicationCommandInteractionDataSubcommandOption | undefined {
  return interaction.data.options?.[0]?.type === ApplicationCommandOptionType.Subcommand
    ? interaction.data.options?.[0]
    : undefined;
}

function getSubOption(
  subcommand: APIApplicationCommandInteractionDataSubcommandOption,
  name: string,
  type: ApplicationCommandOptionType,
): string | number | undefined {
  const option = subcommand.options?.find(
    (candidate) => candidate.name === name && candidate.type === type,
  );
  if (!option || !("value" in option)) return undefined;
  return typeof option.value === "string" || typeof option.value === "number"
    ? option.value
    : undefined;
}

function buildConfigCommand(spec: ConfigSpec): Command {
  const data = new SlashCommandBuilder()
    .setName(spec.name)
    .setDescription(spec.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName("enable").setDescription(`Attiva ${spec.label}`),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("disable").setDescription(`Disattiva ${spec.label}`),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("canale")
        .setDescription(`Imposta il canale per ${spec.label}`)
        .addChannelOption((option) =>
          option.setName("canale").setDescription("Canale da usare").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(spec.textOptionName)
        .setDescription(spec.textDescription)
        .addStringOption((option) =>
          option.setName("testo").setDescription("Nuovo testo").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("mostra").setDescription(`Mostra la configurazione di ${spec.label}`),
    );

  return {
    category: "Info",
    data,
    async execute({ env, interaction }) {
      const guildId = interaction.guild_id;
      if (!guildId) {
        return ephemeralError("Questo comando può essere usato solo in un server.");
      }
      const subcommand = getSubcommand(interaction);
      if (!subcommand) {
        return ephemeralError("Sottocomando non valido.");
      }

      const db = env.DB;
      const settings = await ensureGuildSettings(db, guildId);
      const patch: GuildSettingsPatch = {};

      switch (subcommand.name) {
        case "enable":
          patch[spec.enabledField] = true;
          break;
        case "disable":
          patch[spec.enabledField] = false;
          break;
        case "canale": {
          const channelId = getSubOption(
            subcommand,
            "canale",
            ApplicationCommandOptionType.Channel,
          );
          if (typeof channelId !== "string") {
            return ephemeralError("Canale non valido.");
          }
          patch[spec.channelField] = channelId;
          break;
        }
        case spec.textOptionName: {
          const text = getSubOption(subcommand, "testo", ApplicationCommandOptionType.String);
          if (typeof text !== "string" || text.trim().length === 0) {
            return ephemeralError("Testo non valido.");
          }
          patch[spec.textField] = text;
          break;
        }
        case "mostra": {
          const channelId = settings[spec.channelField];
          return embedResponse({
            color: SUCCESS_COLOR,
            title: `⚙️ Configurazione ${spec.label}`,
            fields: [
              {
                name: "Stato",
                value: settings[spec.enabledField] ? "Attivo ✅" : "Disattivato 🛑",
                inline: true,
              },
              {
                name: "Canale",
                value: channelId ? `<#${channelId}>` : "Non impostato",
                inline: true,
              },
              {
                name: spec.textOptionName === "formato" ? "Formato" : "Messaggio",
                value: settings[spec.textField] ?? spec.defaultText,
              },
            ],
          });
        }
        default:
          return ephemeralError("Sottocomando non valido.");
      }

      await updateGuildSettings(db, guildId, patch);
      return ephemeralEmbed({
        color: SUCCESS_COLOR,
        description: `✅ Configurazione di ${spec.label} aggiornata.`,
      });
    },
  };
}

export const welcomeCommand = buildConfigCommand({
  name: "welcome",
  description: "Configura il messaggio di benvenuto",
  label: "il benvenuto",
  enabledField: "welcomeEnabled",
  channelField: "welcomeChannelId",
  textField: "welcomeMessage",
  textOptionName: "messaggio",
  textDescription: "Imposta il messaggio di benvenuto ({{utente}}, {{membri}})",
  defaultText: DEFAULT_WELCOME_MESSAGE,
});

export const farewellCommand = buildConfigCommand({
  name: "farewell",
  description: "Configura il messaggio di addio",
  label: "l'addio",
  enabledField: "farewellEnabled",
  channelField: "farewellChannelId",
  textField: "farewellMessage",
  textOptionName: "messaggio",
  textDescription: "Imposta il messaggio di addio ({{utente}}, {{membri}})",
  defaultText: DEFAULT_FAREWELL_MESSAGE,
});

export const counterCommand = buildConfigCommand({
  name: "counter",
  description: "Configura il contatore membri",
  label: "il contatore membri",
  enabledField: "counterEnabled",
  channelField: "counterChannelId",
  textField: "counterFormat",
  textOptionName: "formato",
  textDescription: "Imposta il formato del contatore ({{membri}})",
  defaultText: DEFAULT_COUNTER_FORMAT,
});
