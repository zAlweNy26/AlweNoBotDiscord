import {
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
} from "discord.js";

type Interaction = APIChatInputApplicationCommandInteraction;

function findOption(interaction: Interaction, name: string) {
  return interaction.data.options?.find((option) => option.name === name);
}

export function getStringOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name);
  return option?.type === ApplicationCommandOptionType.String ? option.value : undefined;
}

export function getIntegerOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name);
  return option?.type === ApplicationCommandOptionType.Integer ? option.value : undefined;
}

export function getUserOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name);
  if (!option || option.type !== ApplicationCommandOptionType.User) return undefined;
  const user = interaction.data.resolved?.users?.[option.value];
  if (!user) return undefined;
  return { user, member: interaction.data.resolved?.members?.[option.value] };
}
