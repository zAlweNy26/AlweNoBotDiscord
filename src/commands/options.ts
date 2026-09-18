import {
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
} from "discord.js"

type Interaction = APIChatInputApplicationCommandInteraction

function findOption(interaction: Interaction, name: string) {
  return interaction.data.options?.find((option) => option.name === name)
}

export function getStringOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name)
  return option?.type === ApplicationCommandOptionType.String ? option.value : undefined
}

export function getIntegerOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name)
  return option?.type === ApplicationCommandOptionType.Integer ? option.value : undefined
}

export function getChannelOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name)
  return option?.type === ApplicationCommandOptionType.Channel ? option.value : undefined
}

export function getUserOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name)
  if (!option || option.type !== ApplicationCommandOptionType.User) return undefined
  const user = interaction.data.resolved?.users?.[option.value]
  if (!user) return undefined
  return { user, member: interaction.data.resolved?.members?.[option.value] }
}

export function getSubcommand(interaction: Interaction) {
  const option = interaction.data.options?.[0]
  return option?.type === ApplicationCommandOptionType.Subcommand ? option : undefined
}

export function getSubOption(
  subcommand: APIApplicationCommandInteractionDataSubcommandOption,
  name: string,
  type: ApplicationCommandOptionType,
) {
  const option = subcommand.options?.find((candidate) => candidate.name === name && candidate.type === type)
  if (!option || !("value" in option)) return undefined
  return typeof option.value === "string" || typeof option.value === "number" ? option.value : undefined
}
