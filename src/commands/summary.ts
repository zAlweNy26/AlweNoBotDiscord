import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIMessage,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import {
  addSummaryChannel,
  getSummaryChannel,
  listSummaryChannelsForGuild,
  removeSummaryChannel,
} from "../db";
import { deferredResponse, ephemeralEmbed, ephemeralError, SUCCESS_COLOR } from "../respond";
import { getSummaryStatus } from "../summary";
import type { Command } from "./types";

const MIN_THRESHOLD = 10;
const MAX_THRESHOLD = 500;
const DEFAULT_THRESHOLD = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function getChannelId(
  subcommand: APIApplicationCommandInteractionDataSubcommandOption,
): string | undefined {
  const channelId = getSubOption(subcommand, "channel", ApplicationCommandOptionType.Channel);
  return typeof channelId === "string" ? channelId : undefined;
}

const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Configure automatic channel summaries")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Start summarizing a channel")
      .addChannelOption((option) =>
        option.setName("channel").setDescription("Channel to summarize").setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("threshold")
          .setDescription(`Messages per summary (${MIN_THRESHOLD}-${MAX_THRESHOLD})`)
          .setMinValue(MIN_THRESHOLD)
          .setMaxValue(MAX_THRESHOLD),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Stop summarizing a channel")
      .addChannelOption((option) =>
        option.setName("channel").setDescription("Channel to stop summarizing").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("List summarized channels"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Show how close each channel is to its next summary"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("manual")
      .setDescription("Summarize recent messages on demand")
      .addIntegerOption((option) =>
        option
          .setName("messages")
          .setDescription(
            `How many recent messages to summarize (${MIN_THRESHOLD}-${MAX_THRESHOLD})`,
          )
          .setMinValue(MIN_THRESHOLD)
          .setMaxValue(MAX_THRESHOLD)
          .setRequired(true),
      ),
  );

export const summaryCommand: Command = {
  category: "Info",
  data,
  async execute(context) {
    const { env, rest, interaction } = context;
    const guildId = interaction.guild_id;
    if (!guildId) {
      return ephemeralError("This command can only be used in a server.");
    }
    const subcommand = getSubcommand(interaction);
    if (!subcommand) {
      return ephemeralError("Invalid subcommand.");
    }

    switch (subcommand.name) {
      case "add": {
        const channelId = getChannelId(subcommand);
        if (!channelId) {
          return ephemeralError("Invalid channel.");
        }
        const requested = getSubOption(
          subcommand,
          "threshold",
          ApplicationCommandOptionType.Integer,
        );
        const threshold =
          typeof requested === "number"
            ? clamp(requested, MIN_THRESHOLD, MAX_THRESHOLD)
            : DEFAULT_THRESHOLD;

        let baseline = "0";
        try {
          baseline =
            (
              (await rest.get(Routes.channelMessages(channelId), {
                query: new URLSearchParams({ limit: "1" }),
              })) as APIMessage[]
            )[0]?.id ?? "0";
        } catch (error) {
          console.error(`Failed to read baseline for channel ${channelId}`, error);
          return ephemeralError(
            "I can't read messages in that channel. Check that I have access and try again.",
          );
        }

        await addSummaryChannel(env.DB, guildId, channelId, threshold, baseline);
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: `Summarization enabled in <#${channelId}> every ${threshold} messages. Only messages sent from now on will be counted.`,
        });
      }
      case "remove": {
        const channelId = getChannelId(subcommand);
        if (!channelId) {
          return ephemeralError("Invalid channel.");
        }
        if (!(await getSummaryChannel(env.DB, guildId, channelId))) {
          return ephemeralEmbed({
            color: SUCCESS_COLOR,
            description: `No summarization is configured for <#${channelId}>.`,
          });
        }
        await removeSummaryChannel(env.DB, guildId, channelId);
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          description: `Summarization disabled for <#${channelId}>.`,
        });
      }
      case "list": {
        const rows = await listSummaryChannelsForGuild(env.DB, guildId);
        if (rows.length === 0) {
          return ephemeralEmbed({
            color: SUCCESS_COLOR,
            description: "No summarization configured.",
          });
        }
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: "📝 Summarized channels",
          description: rows
            .map((row) => `<#${row.channelId}> — every ${row.threshold} messages`)
            .join("\n"),
        });
      }
      case "status": {
        const rows = await listSummaryChannelsForGuild(env.DB, guildId);
        if (rows.length === 0) {
          return ephemeralEmbed({
            color: SUCCESS_COLOR,
            description: "No summarization configured.",
          });
        }
        return ephemeralEmbed({
          color: SUCCESS_COLOR,
          title: "📝 Summary status",
          description: (
            await Promise.all(
              rows.map(async (row) => {
                try {
                  const status = await getSummaryStatus(rest, row);
                  const progress = `${status.counted} / ${row.threshold} messages`;
                  if (status.ready) {
                    return `<#${row.channelId}> — ${progress} · ready`;
                  }
                  return `<#${row.channelId}> — ${progress} · ${row.threshold - status.counted} to go`;
                } catch (error) {
                  console.error(`Failed to read status for channel ${row.channelId}`, error);
                  return `<#${row.channelId}> — couldn't read channel`;
                }
              }),
            )
          ).join("\n"),
        });
      }
      case "manual": {
        const channelId = interaction.channel_id;
        if (!channelId) {
          return ephemeralError("Invalid channel.");
        }
        const requested = getSubOption(
          subcommand,
          "messages",
          ApplicationCommandOptionType.Integer,
        );
        const needed =
          typeof requested === "number"
            ? clamp(requested, MIN_THRESHOLD, MAX_THRESHOLD)
            : MIN_THRESHOLD;
        try {
          await env.alwenobot_summary.send({ channelId, needed, token: interaction.token });
        } catch (error) {
          console.error(`Failed to queue manual summary for channel ${channelId}`, error);
          return ephemeralError("Couldn't queue the summary. Please try again later.");
        }
        return deferredResponse();
      }
      default:
        return ephemeralError("Invalid subcommand.");
    }
  },
};
