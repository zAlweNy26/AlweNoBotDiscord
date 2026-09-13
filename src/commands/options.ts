import type { APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { ApplicationCommandOptionType } from "discord-api-types/v10";

type Interaction = APIChatInputApplicationCommandInteraction;

function findOption(interaction: Interaction, name: string) {
  return interaction.data.options?.find((option) => option.name === name);
}

export function getStringOption(interaction: Interaction, name: string): string | undefined {
  const option = findOption(interaction, name);
  return option?.type === ApplicationCommandOptionType.String ? option.value : undefined;
}

export function getIntegerOption(interaction: Interaction, name: string): number | undefined {
  const option = findOption(interaction, name);
  return option?.type === ApplicationCommandOptionType.Integer ? option.value : undefined;
}

export function getChannelOption(interaction: Interaction, name: string): string | undefined {
  const option = findOption(interaction, name);
  return option?.type === ApplicationCommandOptionType.Channel ? option.value : undefined;
}

export function getRoleOption(interaction: Interaction, name: string): string | undefined {
  const option = findOption(interaction, name);
  return option?.type === ApplicationCommandOptionType.Role ? option.value : undefined;
}

export function getUserOption(interaction: Interaction, name: string) {
  const option = findOption(interaction, name);
  if (!option || option.type !== ApplicationCommandOptionType.User) return undefined;
  const user = interaction.data.resolved?.users?.[option.value];
  if (!user) return undefined;
  return { user, member: interaction.data.resolved?.members?.[option.value] };
}
