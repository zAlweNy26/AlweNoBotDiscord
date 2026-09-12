CREATE TABLE `summary_channels` (
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`threshold` integer DEFAULT 100 NOT NULL,
	`last_message_id` text NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`guild_id`, `channel_id`)
);
