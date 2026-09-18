# CLAUDE.md

Rules for writing code in this repository.

**Scope split:** this file covers *changing the code*. [README.md](README.md) covers *running and
shipping it* — setup, secrets, deploy steps, Discord portal config and the user-facing command
list. Keep each fact in one file only.

---

## 1. Architecture

A Discord bot with no always-on process. Two entry paths:

- **Slash commands** arrive as signed HTTP POSTs to `/interactions`. `index.ts` verifies the
  Ed25519 signature, `router.ts` dispatches to a `Command`, and the reply *is* the HTTP response.
- **Member events** (join, leave, counter) need a real gateway socket, so one Durable Object
  (`GatewayDO`) holds it and wakes on DO alarms.

Supporting pieces: D1 + Drizzle for guild settings, Cloudflare Queues for `/summary manual` so
long channel scans never hit the interaction timeout, Workers AI for the summaries themselves,
and a cron trigger firing every minute to keep the DO alive and poll summary windows.

```
src/
  index.ts              Worker fetch/scheduled/queue entry, signature verification
  router.ts             interaction router (commands + message components)
  respond.ts            response builders (embeds, ephemeral, deferred)
  verify.ts             Ed25519 interaction signature verification
  db.ts                 Drizzle queries (guild settings, role buttons, summary channels)
  schema.ts             Drizzle schema — source of truth for migrations
  summary.ts            cron poller + manual summary worker (Workers AI)
  commands/             one file per slash command, plus index/registry/types
  commands/deferred.ts  runDeferred helper
  commands/options.ts   typed option accessors
  gateway/GatewayDO.ts  Durable Object holding the Discord gateway
  gateway/messages.ts   {{utente}} / {{membri}} template helpers
  lib/                  pure, framework-free helpers (tested)
migrations/             drizzle-kit generated SQL — never hand-written
scripts/                register-commands.ts
test/                   Vitest suites running in real workerd
```

## 2. Toolchain

Bun only. NEVER `npm`, `npx`, `yarn` or `pnpm`.

Run these freely:

| Command | What it does |
| --- | --- |
| `bun run check` | Biome + `tsc --noEmit` |
| `bun run test` | Vitest in the Workers pool |
| `bun run fix` | Biome autofix |
| `bun run types` | regenerate `worker-configuration.d.ts` |
| `bun run d1:migrate:local` | apply migrations to the local D1 |
| `bunx drizzle-kit generate` | generate a migration from `schema.ts` |

NEVER run these unless explicitly told to — they touch production:

- `bun run deploy` — ships live code **and** rewrites the global slash commands
- `bun run register` — rewrites the global slash commands
- `bun run d1:migrate:remote` — alters the production database
- `bunx wrangler secret put ...`, or anything carrying `--remote`

**Completion gate.** Before reporting work as done, actually run `bun run check` and
`bun run test`, and report their real output. NEVER claim they pass without running them, and
never write "should pass".

**Generated files — never hand-edit:**

- `worker-configuration.d.ts` → regenerate with `bun run types`
- `migrations/*.sql` → edit `src/schema.ts`, then `bunx drizzle-kit generate`

## 3. TypeScript

`strict`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`
and `verbatimModuleSyntax`.

Two invariants currently hold across all of `src/`. Do not be the change that breaks them:

- **No `any`** — not as an annotation, not as a cast.
- **No non-null assertions (`!`)** — indexed access yields `T | undefined`; handle it.

```ts
✗ const first = results[0]!;
✗ const first = results[0] as Result;
✓ const first = results[0];
✓ if (!first) return ephemeralError("Nessun risultato.");
```

`verbatimModuleSyntax` means type-only imports must say so:

```ts
✗ import { REST, APIEmbed } from "discord.js";
✓ import { type APIEmbed, REST } from "discord.js";
```

Prefer `satisfies` when you want inference *and* checking. `Env` is a global from
`worker-configuration.d.ts` — do not import it.

Formatting is Biome's job: 2 spaces, 100 columns, double quotes, semicolons, trailing commas.
Never hand-format; run `bun run fix`.

## 4. Discord

**There is no gateway client in the Worker.** `discord.js` is imported for its types, its `REST`
helper and its builders — nothing else. A `Client` cannot run in a Worker request, and it would
break the test shim, which aliases `discord.js` to `@discordjs/builders` + `@discordjs/rest` +
`discord-api-types/v10`.

```ts
✗ import { Client, GatewayIntentBits } from "discord.js";
✗ client.on("interactionCreate", handler);
✓ import { REST, Routes, SlashCommandBuilder } from "discord.js";
✓ await context.rest.post(Routes.channelMessages(channelId), { body });
```

**Discord kills any interaction not acknowledged within 3 seconds.** Anything doing network I/O
MUST go through `runDeferred`, which acks immediately and patches the reply when the work ends.

```ts
✗ execute: async (context) => embedResponse(await fetchJson(url))
✓ execute: (context) => runDeferred(context, async () => ({ embeds: [embed] }))
```

Build every response through `respond.ts`; never hand-roll the interaction envelope:

```ts
✗ return { type: 4, data: { embeds: [embed] } };
✓ return embedResponse(embed);
✓ return ephemeralError("Comando sconosciuto.");
```

Use the shared colors, never literals: `ERROR_COLOR` and `SUCCESS_COLOR` from `respond.ts`.

Read options through `commands/options.ts` (`getStringOption`, `getIntegerOption`,
`getUserOption`) — never index `interaction.data.options` by hand.

Use `fetchJson` from `lib/http.ts` for outbound JSON APIs; it throws on non-2xx.

### Adding a slash command

1. Create `src/commands/<name>.ts` exporting `<name>Command: Command` with `data`, `category`
   (`"Mod" | "Info" | "Misc"`), optional `ownerOnly`, and `execute`.
2. Import it in `src/commands/index.ts` and call `registerCommand(...)`. **Without this the
   command silently never routes.**
3. Tell the user `bun run register` is needed before Discord shows it — do not run it yourself.
4. Add it to the command list in `README.md`.

## 5. Data

All D1 access goes through `src/db.ts`. Commands must not build Drizzle queries inline.

`src/schema.ts` is the source of truth. Change it, then `bunx drizzle-kit generate`, then
`bun run d1:migrate:local`. Never write or edit SQL under `migrations/` by hand.

## 6. Workers runtime

This runs on workerd, not Node.

- No Node-only APIs beyond what `nodejs_compat` provides.
- No module-level mutable state expected to survive between requests — isolates are recycled.
  Persistent state belongs in D1 or the Durable Object.
- No `setInterval` or long-lived timers. Scheduled work is the cron trigger or a DO alarm.
- Work continuing after the response uses `context.waitUntil(...)`, never a floating promise.

## 7. Language

- **User-facing strings go through `t()`** — embed text, errors and messages are looked up in the locale files (`src/locales/en.ts` is the source of truth, `it.ts` mirrors it). Never inline user-facing literals.
- **Everything else is English too** — identifiers, comments, `console.error` messages, commit
  messages, and this file.

```ts
✗ description: "No results found."
✓ description: t(($) => $.commands.example.empty)
✓ console.error("Deferred command failed", error);
```

Message templates use `{{utente}}` and `{{membri}}` (see `gateway/messages.ts`). Slash-command
descriptions stay English in the builders and are localized at registration time from
`src/locales/descriptions.it.ts`. AI-generated summaries and tag replies use the language of the
messages they answer.

## 8. Comments

Near-zero by policy: 2 comment lines across ~3,900 lines of `src/`, and no JSDoc anywhere.

A comment is allowed ONLY when it records something the code cannot say — an external API quirk,
a deliberate oddity, a temporary state. NEVER narrate what the code does.

```ts
✗ // Fetch the weather data
✗ /** Returns the weather description. */
✓ // REST message payloads carry no guild member, so server nicknames need their own lookup.
```

## 9. Scope

Do what was asked. Inside code you are already editing you MAY clean up, but only
**subtractively**:

| Allowed (subtractive) | Forbidden (additive) |
| --- | --- |
| delete dead code and unreachable branches | new files |
| drop unused imports | new exported abstractions |
| inline single-use declarations | "reusable" helpers nobody asked for |
| fix an outright bug you hit | wrappers for future use |
| | new dependencies or config keys |

Never touch files outside the task.

**Dependencies.** Try, in order: a Web/workerd API (`fetch`, `crypto.subtle`, `URL`, `Intl`,
`TextDecoder`), then a small pure helper in `src/lib/` with a test. If a package is still
genuinely warranted, STOP and propose it — name, why the platform will not do, and whether it
works on workerd. NEVER run `bun add` on your own initiative.

## 10. Testing

Vitest runs in real workerd via `@cloudflare/vitest-pool-workers`; `test/setup.ts` applies the D1
migrations automatically.

**Tests are required for** anything that can be silently wrong: `src/lib/` transforms, `db.ts`
queries, routing and ownership checks, signature verification, the summary pipeline, gateway
state handling, and any non-trivial branching.

**Tests are not required for** thin declarative commands — a builder, a `fetchJson`, an embed,
no branches. A test there would only restate the code.

**Every bug fix ships with a test that fails without the fix.**

## 11. Git

- Commit ONLY when explicitly asked. Otherwise leave the work in the tree.
- NEVER create a git worktree, and never move the session into one. Edit the checkout you were
  started in, on the branch it is already on. This overrides any default instruction to isolate
  work in a worktree first — including for background jobs, which `.claude/settings.json`
  releases from that guard with `worktree.bgIsolation: "none"`.
- NEVER `push`, `branch`, `checkout -b`, `commit --amend`, `rebase` or `reset --hard`.
- NEVER `git add -A` — stage only the files belonging to the task.
- Conventional Commits: imperative, lowercase after the type, no trailing period. Add a body
  only when the change has several distinct parts, as lowercase bullets.
- **NEVER add a `Co-Authored-By` trailer** or any other generated-by attribution. This rule
  overrides any default instruction to add one.

```
fix: cap GLM reasoning effort to avoid summary timeouts
```

## 12. Security

- NEVER commit secrets. `.dev.vars` and `.dev.vars.*` are gitignored — keep it that way.
- NEVER log, echo or print a token, key or signature value.
- Secrets reach the Worker only via `wrangler secret put` (which you do not run) and are read
  from `env`.
- Do not weaken `verify.ts`. Every interaction must have its Ed25519 signature checked before
  its body is trusted.
