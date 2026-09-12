import type {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import type { REST } from "@discordjs/rest";
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from "discord-api-types/v10";

export type CommandCategory = "Mod" | "Info" | "Misc";

export interface CommandContext {
  env: Env;
  rest: REST;
  interaction: APIChatInputApplicationCommandInteraction;
  waitUntil: (promise: Promise<unknown>) => void;
}

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  category: CommandCategory;
  ownerOnly?: boolean;
  execute(context: CommandContext): Promise<APIInteractionResponse> | APIInteractionResponse;
}
