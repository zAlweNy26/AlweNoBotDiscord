import {
  type APIEmbed,
  type APIInteractionResponse,
  InteractionResponseType,
  MessageFlags,
} from "discord.js";

export const ERROR_COLOR = 0xc80000;
export const SUCCESS_COLOR = 0x00ae86;

export function messageResponse(
  data: NonNullable<
    Extract<
      APIInteractionResponse,
      { type: InteractionResponseType.ChannelMessageWithSource }
    >["data"]
  >,
): APIInteractionResponse {
  return { type: InteractionResponseType.ChannelMessageWithSource, data };
}

export function embedResponse(embed: APIEmbed): APIInteractionResponse {
  return messageResponse({ embeds: [embed] });
}

export function ephemeralEmbed(embed: APIEmbed): APIInteractionResponse {
  return messageResponse({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export function ephemeralError(description: string): APIInteractionResponse {
  return ephemeralEmbed({ color: ERROR_COLOR, description });
}

export function deferredResponse(ephemeral = false): APIInteractionResponse {
  return {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
  };
}
