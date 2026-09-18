import { and, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { guildSettings, roleButtons, summaryChannels } from "./schema"

export interface GuildSettings {
  guildId: string
  welcomeEnabled: boolean
  welcomeChannelId: string | null
  welcomeMessage: string | null
  farewellEnabled: boolean
  farewellChannelId: string | null
  farewellMessage: string | null
  counterEnabled: boolean
  counterChannelId: string | null
  counterFormat: string | null
  mentionEnabled: boolean
  locale: string | null
}

export type GuildSettingsPatch = Partial<Omit<GuildSettings, "guildId">>

function orm(db: D1Database) {
  return drizzle(db)
}

export async function getGuildSettings(db: D1Database, guildId: string) {
  return (await orm(db).select().from(guildSettings).where(eq(guildSettings.guildId, guildId)).limit(1))[0] ?? null
}

export async function ensureGuildSettings(db: D1Database, guildId: string) {
  await orm(db).insert(guildSettings).values({ guildId }).onConflictDoNothing()
  const settings = await getGuildSettings(db, guildId)
  if (!settings) {
    throw new Error(`Failed to create guild settings for ${guildId}`)
  }
  return settings
}

export async function updateGuildSettings(db: D1Database, guildId: string, patch: GuildSettingsPatch) {
  const values: Record<string, string | boolean | null> = {}
  for (const [field, value] of Object.entries(patch)) {
    if (value !== undefined) {
      values[field] = value
    }
  }
  if (Object.keys(values).length === 0) return
  await ensureGuildSettings(db, guildId)
  await orm(db).update(guildSettings).set(values).where(eq(guildSettings.guildId, guildId))
}

export interface SummaryChannel {
  guildId: string
  channelId: string
  threshold: number
  lastMessageId: string
  failureCount: number
  createdAt: number
}

export interface SummaryProgressPatch {
  lastMessageId?: string
  failureCount?: number
}

export async function listSummaryChannels(db: D1Database) {
  return orm(db).select().from(summaryChannels)
}

export async function listSummaryChannelsForGuild(db: D1Database, guildId: string) {
  return orm(db)
    .select()
    .from(summaryChannels)
    .where(eq(summaryChannels.guildId, guildId))
    .orderBy(summaryChannels.channelId)
}

export async function getSummaryChannel(db: D1Database, guildId: string, channelId: string) {
  return (
    (
      await orm(db)
        .select()
        .from(summaryChannels)
        .where(and(eq(summaryChannels.guildId, guildId), eq(summaryChannels.channelId, channelId)))
        .limit(1)
    )[0] ?? null
  )
}

export async function addSummaryChannel(
  db: D1Database,
  guildId: string,
  channelId: string,
  threshold: number,
  baselineMessageId: string,
) {
  await orm(db)
    .insert(summaryChannels)
    .values({
      guildId,
      channelId,
      threshold,
      lastMessageId: baselineMessageId,
      failureCount: 0,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [summaryChannels.guildId, summaryChannels.channelId],
      set: { threshold, lastMessageId: baselineMessageId, failureCount: 0 },
    })
}

export async function removeSummaryChannel(db: D1Database, guildId: string, channelId: string) {
  await orm(db)
    .delete(summaryChannels)
    .where(and(eq(summaryChannels.guildId, guildId), eq(summaryChannels.channelId, channelId)))
}

export async function updateSummaryProgress(
  db: D1Database,
  guildId: string,
  channelId: string,
  patch: SummaryProgressPatch,
) {
  const values: SummaryProgressPatch = {}
  if (patch.lastMessageId !== undefined) values.lastMessageId = patch.lastMessageId
  if (patch.failureCount !== undefined) values.failureCount = patch.failureCount
  if (Object.keys(values).length === 0) return
  await orm(db)
    .update(summaryChannels)
    .set(values)
    .where(and(eq(summaryChannels.guildId, guildId), eq(summaryChannels.channelId, channelId)))
}

export interface RoleButton {
  messageId: string
  roleId: string
  guildId: string
  label: string
  emoji: string | null
}

export async function addRoleButton(db: D1Database, button: RoleButton) {
  await orm(db)
    .insert(roleButtons)
    .values(button)
    .onConflictDoUpdate({
      target: [roleButtons.messageId, roleButtons.roleId],
      set: { label: button.label, emoji: button.emoji },
    })
}

export async function getRoleButton(db: D1Database, messageId: string, roleId: string) {
  return (
    (
      await orm(db)
        .select()
        .from(roleButtons)
        .where(and(eq(roleButtons.messageId, messageId), eq(roleButtons.roleId, roleId)))
        .limit(1)
    )[0] ?? null
  )
}

export async function deleteRoleButtonsForMessage(db: D1Database, messageId: string) {
  await orm(db).delete(roleButtons).where(eq(roleButtons.messageId, messageId))
}
