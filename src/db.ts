import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { guildSettings, roleButtons } from "./schema";

export interface GuildSettings {
  guildId: string;
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  farewellEnabled: boolean;
  farewellChannelId: string | null;
  farewellMessage: string | null;
  counterEnabled: boolean;
  counterChannelId: string | null;
  counterFormat: string | null;
}

export const DEFAULT_WELCOME_MESSAGE = "👋 Benvenuto {{utente}} nel server!";
export const DEFAULT_FAREWELL_MESSAGE = "👋 Ciao {{utente}}, a presto!";
export const DEFAULT_COUNTER_FORMAT = "👥 Membri : {{membri}}";

export type GuildSettingsPatch = Partial<Omit<GuildSettings, "guildId">>;

function orm(db: D1Database) {
  return drizzle(db);
}

export async function getGuildSettings(
  db: D1Database,
  guildId: string,
): Promise<GuildSettings | null> {
  const rows = await orm(db)
    .select()
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId))
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureGuildSettings(db: D1Database, guildId: string): Promise<GuildSettings> {
  await orm(db).insert(guildSettings).values({ guildId }).onConflictDoNothing();
  const settings = await getGuildSettings(db, guildId);
  if (!settings) {
    throw new Error(`Failed to create guild settings for ${guildId}`);
  }
  return settings;
}

export async function updateGuildSettings(
  db: D1Database,
  guildId: string,
  patch: GuildSettingsPatch,
): Promise<void> {
  const values: Record<string, string | boolean | null> = {};
  for (const [field, value] of Object.entries(patch)) {
    if (value !== undefined) {
      values[field] = value;
    }
  }
  if (Object.keys(values).length === 0) return;
  await ensureGuildSettings(db, guildId);
  await orm(db).update(guildSettings).set(values).where(eq(guildSettings.guildId, guildId));
}

export interface RoleButton {
  messageId: string;
  roleId: string;
  guildId: string;
  label: string;
  emoji: string | null;
}

export async function addRoleButton(db: D1Database, button: RoleButton): Promise<void> {
  await orm(db)
    .insert(roleButtons)
    .values(button)
    .onConflictDoUpdate({
      target: [roleButtons.messageId, roleButtons.roleId],
      set: { label: button.label, emoji: button.emoji },
    });
}

export async function getRoleButton(
  db: D1Database,
  messageId: string,
  roleId: string,
): Promise<RoleButton | null> {
  const rows = await orm(db)
    .select()
    .from(roleButtons)
    .where(and(eq(roleButtons.messageId, messageId), eq(roleButtons.roleId, roleId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listRoleButtons(db: D1Database, guildId: string): Promise<RoleButton[]> {
  return orm(db)
    .select()
    .from(roleButtons)
    .where(eq(roleButtons.guildId, guildId))
    .orderBy(roleButtons.messageId, roleButtons.roleId);
}

export async function deleteRoleButton(
  db: D1Database,
  messageId: string,
  roleId: string,
): Promise<void> {
  await orm(db)
    .delete(roleButtons)
    .where(and(eq(roleButtons.messageId, messageId), eq(roleButtons.roleId, roleId)));
}

export async function deleteRoleButtonsForMessage(
  db: D1Database,
  messageId: string,
): Promise<void> {
  await orm(db).delete(roleButtons).where(eq(roleButtons.messageId, messageId));
}
