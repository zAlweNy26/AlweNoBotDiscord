import { DiscordAPIError, PermissionFlagsBits } from "discord.js"
import type { TFunction } from "i18next"
import { normalizeLocale } from "./i18n"

export type DiscordErrorKey = "channelGone" | "guildGone" | "memberGone" | "roleGone" | "forbidden" | "channelType"

const CODE_KEYS: Record<number, DiscordErrorKey> = {
  10003: "channelGone",
  10004: "guildGone",
  10007: "memberGone",
  10011: "roleGone",
  50001: "forbidden",
  50013: "forbidden",
  50024: "channelType",
}

export function discordErrorKey(error: unknown): DiscordErrorKey | undefined {
  if (!(error instanceof DiscordAPIError)) return undefined
  return CODE_KEYS[Number(error.code)] ?? (error.status === 403 ? "forbidden" : undefined)
}

export function discordErrorDetail(error: unknown): string {
  if (!(error instanceof DiscordAPIError)) return ""
  return ` (code ${error.code}, status ${error.status})`
}

export type PermissionLabelKey = "manageMessages" | "readMessageHistory" | "manageRoles"

const PERMISSION_KEYS = new Map<bigint, PermissionLabelKey>([
  [PermissionFlagsBits.ManageMessages, "manageMessages"],
  [PermissionFlagsBits.ReadMessageHistory, "readMessageHistory"],
  [PermissionFlagsBits.ManageRoles, "manageRoles"],
])

export function permissionErrorMessage(
  t: TFunction,
  locale: string,
  interaction: { app_permissions?: string },
  ...flags: bigint[]
): string | undefined {
  const granted = interaction.app_permissions
  if (granted === undefined) return undefined

  const permissions = BigInt(granted)
  const missing = flags.flatMap((flag) => {
    const key = PERMISSION_KEYS.get(flag)
    return key && (permissions & flag) !== flag ? [key] : []
  })
  if (missing.length === 0) return undefined

  const labels = new Intl.ListFormat(normalizeLocale(locale), { style: "long", type: "conjunction" }).format(
    missing.map((key) => `**${t(($) => $.permissions.labels[key])}**`),
  )
  return t(($) => $.permissions.missing, { count: missing.length, permissions: labels })
}
