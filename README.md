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
KLIPY_API_KEY=
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

`bun run register` remains available to refresh the Discord-side command definitions without deploying (for example description-only changes). Set `DISCORD_GUILD_ID` in `.dev.vars` to register the commands in a single development server instead, where updates appear instantly; remove it to go back to global registration.

## Commands

- Info: `/ping`, `/info`, `/server`, `/activity`, `/stats` (owner only)
- Mod: `/help`, `/clear`, `/welcome`, `/farewell`, `/counter`, `/mention`, `/interfere`, `/language`, `/summary`, `/reactionrole`
- Misc: `/color`, `/crypto`, `/distance`, `/weather`, `/steam`, `/steamgame`, `/ytinfo`

## Notes

- The privileged **Message Content Intent** must be enabled for `/summary`: without it, the Discord API returns empty `content` for channel history. The AI summaries run on Workers AI (`AI` binding) with `@cf/zai-org/glm-5.3-flash`.
- `/summary manual` is available to every member; the other `/summary` subcommands require the **Manage Server** permission.
- `/summary manual` and `/activity` are processed through Cloudflare Queues (`alwenobot_summary`): the deferred reply is patched as soon as the work is done, so long channel scans never hit the interaction timeout and never hold a request open. Both share the one queue and are told apart by the `kind` field on the message; a message without `kind` is treated as a summary. Automatic summaries are unchanged.
- `/mention enable` lets the bot answer whoever tags it, in the voice of the summaries pitched to the message it is answering (same Workers AI model, one reply per tag). It is off by default and configured per server; `/mention show` shows the current state. The reply needs the gateway to receive `MESSAGE_CREATE`, which the Durable Object subscribes to through the (non-privileged) **Guild Messages** intent — nothing to enable in the portal. Intents are frozen when a gateway session identifies, so the first reconnect after this deploy identifies from scratch instead of resuming. To keep the AI usage bounded each user gets at most one reply every 60 seconds and each server 100 replies per day; further tags are ignored. A reply can also be a gif instead of text: when the model asks for one, the bot searches it on Klipy (the `KLIPY_API_KEY` secret) and posts the gif alone; when the search fails or finds nothing, the tag is left unanswered.
- `/interfere enable` lets the bot read along and occasionally butt into a message nobody addressed to it. On every message it rolls the dice (about 1 in 4), stays quiet for 5 minutes in a channel after it has spoken, and each server gets at most 20 spontaneous replies per day; to decide it keeps the last 8 messages of the channel in memory, so the window is lost when the Durable Object restarts. Like tag replies it can answer with text or with a gif alone, and when it has nothing worth adding it stays silent. It is off by default and configured per server, independently from `/mention`; `/interfere show` shows the current state.
- Automatic summaries start with `@here #summary` in the message content. The `@here` ping requires the **Mention @everyone, @here and all roles** permission (without it the mention is posted without notifying). Search `summary` (or `#summary`) to list past summaries.
- The member counter channel rename is debounced (10 minutes) to stay well inside Discord rate limits.
- Commands reply in the invoker's Discord client locale. Server-scoped texts — welcome, farewell and counter defaults, and the localized slash-command descriptions — follow the locale stored per guild, set with `/language`. AI-generated summaries and tag replies follow the language of the messages they answer.
- Legacy `steam_countries.min.json` was replaced by `Intl.DisplayNames` (`src/lib/countries.ts`); the counter format supports `{{membri}}`.
