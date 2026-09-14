# AlweNoBot

Discord bot running entirely on Cloudflare Workers.

Slash commands arrive as HTTP interactions to a Worker. A Durable Object
(`GatewayDO`) holds the Discord gateway connection to handle member events
(welcome, farewell, member counter). Settings are stored in Cloudflare D1
through Drizzle ORM. There is no always-on process and no `discord.js` client.

This README covers running and shipping the bot. For the code itself — architecture, directory
layout, conventions and the rules contributors follow — see [CLAUDE.md](CLAUDE.md).

## Stack

- Runtime: Cloudflare Workers (workerd)
- Language: TypeScript
- Package manager / local tooling: Bun
- Discord: `discord.js` v14
- Storage: Cloudflare D1 + Drizzle ORM (migrations via drizzle-kit)
- Gateway: custom Durable Object + DO alarms
- Tests: Vitest with `@cloudflare/vitest-pool-workers` (real workerd)
- Lint/format: Biome

## Setup

1. `bun install`
2. Create `.dev.vars` (gitignored) with:

```
DISCORD_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
OWNER_ID=
STEAM_API_KEY=
YOUTUBE_API_KEY=
BING_MAPS_KEY=
```

3. `bunx wrangler types` regenerates `worker-configuration.d.ts` after config changes
4. `bun run d1:migrate:local`

## Develop

- `bun run dev` — start `wrangler dev`
- `bun run check` — Biome + `tsc --noEmit`
- `bun run fix` — Biome autofix
- `bun run test` — Vitest in the Workers pool (applies D1 migrations automatically)

## Deploy

1. `bunx wrangler d1 create alwenobot` and put the id into `wrangler.jsonc` (already configured here)
2. `bun run d1:migrate:remote`
3. Set secrets: `bunx wrangler secret put DISCORD_TOKEN`, repeat for the other secrets
4. `bunx wrangler queues create alwenobot-summary` (one-time; the queue consumer requires it)
5. `bun run deploy` — deploys the Worker and registers the global slash commands
6. In the Discord Developer Portal:
   - set the Interactions Endpoint URL to `https://<worker>.<subdomain>.workers.dev/interactions`
   - enable the **Server Members Intent** (required for welcome/farewell/counter)
   - enable the **Message Content Intent** (required for `/summary`)

`bun run register` remains available to refresh the Discord-side command definitions without deploying (for example description-only changes).

## Commands

- Info: `/ping`, `/info`, `/server`, `/stats` (owner only)
- Mod: `/help`, `/clear`, `/welcome`, `/farewell`, `/counter`, `/summary`, `/reactionrole`
- Misc: `/color`, `/crypto`, `/distance`, `/weather`, `/steam`, `/steamgame`, `/ytinfo`

## Notes

- The privileged **Message Content Intent** must be enabled for `/summary`: without it, the Discord API returns empty `content` for channel history. The AI summaries run on Workers AI (`AI` binding) with `@cf/zai-org/glm-5.3-flash`.
- `/summary manual` is processed through Cloudflare Queues (`alwenobot_summary`): the deferred reply is patched as soon as the summary is ready, so long channel scans never hit the interaction timeout. Automatic summaries are unchanged.
- Automatic summaries start with `@here #summary` in the message content. The `@here` ping requires the **Mention @everyone, @here and all roles** permission (without it the mention is posted without notifying). Search `summary` (or `#summary`) to list past summaries.
- The member counter channel rename is debounced (10 minutes) to stay well inside Discord rate limits.
- Legacy `steam_countries.min.json` was replaced by the `src/lib/countries.ts` map; the counter format supports `{{membri}}`.
