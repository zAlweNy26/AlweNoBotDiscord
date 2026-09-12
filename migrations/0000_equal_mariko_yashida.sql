CREATE TABLE `guild_settings` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`welcome_enabled` integer DEFAULT false NOT NULL,
	`welcome_channel_id` text,
	`welcome_message` text,
	`farewell_enabled` integer DEFAULT false NOT NULL,
	`farewell_channel_id` text,
	`farewell_message` text,
	`counter_enabled` integer DEFAULT false NOT NULL,
	`counter_channel_id` text,
	`counter_format` text
);
--> statement-breakpoint
CREATE TABLE `role_buttons` (
	`message_id` text NOT NULL,
	`role_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`label` text NOT NULL,
	`emoji` text,
	PRIMARY KEY(`message_id`, `role_id`)
);
--> statement-breakpoint
CREATE INDEX `role_buttons_guild_idx` ON `role_buttons` (`guild_id`);