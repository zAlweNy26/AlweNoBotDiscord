import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  REST,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js"

export type CommandCategory = "Mod" | "Info" | "Misc"

export interface CommandContext {
  env: Env
  rest: REST
  interaction: APIChatInputApplicationCommandInteraction
  waitUntil: (promise: Promise<unknown>) => void
}

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder
  category: CommandCategory
  ownerOnly?: boolean
  execute(context: CommandContext): Promise<APIInteractionResponse> | APIInteractionResponse
}
