import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const guildSettings = sqliteTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  welcomeEnabled: integer("welcome_enabled", { mode: "boolean" }).notNull().default(false),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  farewellEnabled: integer("farewell_enabled", { mode: "boolean" }).notNull().default(false),
  farewellChannelId: text("farewell_channel_id"),
  farewellMessage: text("farewell_message"),
  counterEnabled: integer("counter_enabled", { mode: "boolean" }).notNull().default(false),
  counterChannelId: text("counter_channel_id"),
  counterFormat: text("counter_format"),
});

export const summaryChannels = sqliteTable(
  "summary_channels",
  {
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    threshold: integer("threshold").notNull().default(100),
    lastMessageId: text("last_message_id").notNull(),
    failureCount: integer("failure_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.channelId] })],
);

export const roleButtons = sqliteTable(
  "role_buttons",
  {
    messageId: text("message_id").notNull(),
    roleId: text("role_id").notNull(),
    guildId: text("guild_id").notNull(),
    label: text("label").notNull(),
    emoji: text("emoji"),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.roleId] }),
    index("role_buttons_guild_idx").on(table.guildId),
  ],
);
