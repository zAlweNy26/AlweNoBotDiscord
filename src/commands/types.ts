import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  REST,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js"
import type { TFunction } from "i18next"

export type CommandCategory = "Mod" | "Info" | "Misc"

export interface CommandContext {
  env: Env
  rest: REST
  interaction: APIChatInputApplicationCommandInteraction
  waitUntil: (promise: Promise<unknown>) => void
  t: TFunction
  locale: string
}

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder
  category: CommandCategory
  ownerOnly?: boolean
  execute(context: CommandContext): Promise<APIInteractionResponse> | APIInteractionResponse
}
