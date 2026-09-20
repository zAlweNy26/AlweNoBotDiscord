import { APICallError, generateText } from "ai"
import { type APIGuildMember, type APIMessage, type REST, Routes } from "discord.js"
import type { TFunction } from "i18next"
import { createWorkersAI } from "workers-ai-provider"
import {
  getGuildSettings,
  listSummaryChannels,
  removeSummaryChannel,
  type SummaryChannel,
  updateSummaryProgress,
} from "./db"
import { createTranslator, type Locale, normalizeLocale } from "./lib/i18n"
import { ERROR_COLOR } from "./respond"
import { SUMMARY_PROMPTS, type SummaryPrompts } from "./summary-prompts"

const MAX_FAILURES = 3
const AI_MAX_FAILURES = 10
const TRANSIENT_AI_CODES = new Set([3007, 3008, 3036, 3040, 3046])
const MAX_WINDOWS_PER_POLL = 3
const PAGE_LIMIT = 100
const SCAN_LIMIT = 2_000
const CHUNK_CHARS = 100_000
const SUMMARY_COLOR = 0x5865f2
const EMBED_DESCRIPTION_LIMIT = 4096
const NICKNAME_CONCURRENCY = 5

export interface SummaryDeps {
  rest: REST
  summarize: (system: string, user: string) => Promise<string>
}

export interface TranscriptMessage {
  id: string
  timestamp: string
  authorId: string
  authorName: string
  content: string
}

interface FetchResult {
  humans: TranscriptMessage[]
  scanned: number
  exhausted: boolean
}

export function isHumanMessage(message: APIMessage) {
  return !message.author.bot && !message.webhook_id && message.content.trim().length > 0
}

function toTranscriptMessage(message: APIMessage) {
  return {
    id: message.id,
    timestamp: message.timestamp,
    authorId: message.author.id,
    authorName: message.author.global_name ?? message.author.username,
    content: message.content,
  }
}

// REST message payloads carry no guild member, so server nicknames need their own lookup.
async function fetchNickname(rest: REST, guildId: string, userId: string) {
  try {
    const member = (await rest.get(Routes.guildMember(guildId, userId))) as APIGuildMember
    return member.nick ?? undefined
  } catch (error) {
    console.warn(`Could not resolve the nickname of ${userId} in guild ${guildId}`, error)
    return undefined
  }
}

export async function applyGuildNicknames(
  rest: REST,
  guildId: string,
  messages: TranscriptMessage[],
  nicknames = new Map<string, string | undefined>(),
) {
  const pending = [...new Set(messages.map((message) => message.authorId))].filter(
    (authorId) => !nicknames.has(authorId),
  )
  for (let start = 0; start < pending.length; start += NICKNAME_CONCURRENCY) {
    const batch = pending.slice(start, start + NICKNAME_CONCURRENCY)
    await Promise.all(
      batch.map(async (authorId) => {
        nicknames.set(authorId, await fetchNickname(rest, guildId, authorId))
      }),
    )
  }
  return messages.map((message) => {
    const nickname = nicknames.get(message.authorId)
    return nickname ? { ...message, authorName: nickname } : message
  })
}

function formatTime(timestamp: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(timestamp))
}

async function fetchHumans(rest: REST, channelId: string, afterId: string, needed: number, budget: number) {
  const humans: TranscriptMessage[] = []
  let cursor = afterId
  let scanned = 0
  let exhausted = false

  while (humans.length < needed && scanned < budget && !exhausted) {
    const page = (await rest.get(Routes.channelMessages(channelId), {
      query: new URLSearchParams({ after: cursor, limit: String(PAGE_LIMIT) }),
    })) as APIMessage[]
    if (!Array.isArray(page) || page.length === 0) {
      exhausted = true
      break
    }
    scanned += page.length
    for (const message of page) {
      if (isHumanMessage(message)) {
        humans.push(toTranscriptMessage(message))
      }
    }
    const newest = page[0]
    if (!newest) {
      exhausted = true
      break
    }
    cursor = newest.id
    if (page.length < PAGE_LIMIT) {
      exhausted = true
    }
  }

  humans.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))
  return { humans, scanned, exhausted }
}

export async function getSummaryStatus(rest: REST, channel: SummaryChannel) {
  const result = await fetchHumans(rest, channel.channelId, channel.lastMessageId, channel.threshold, SCAN_LIMIT)
  return {
    counted: Math.min(result.humans.length, channel.threshold),
    ready: result.humans.length >= channel.threshold,
  }
}

export async function fetchRecentHumans(rest: REST, channelId: string, needed: number, budget = SCAN_LIMIT) {
  const humans: TranscriptMessage[] = []
  let before: string | undefined
  let scanned = 0

  while (humans.length < needed && scanned < budget) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) })
    if (before) {
      query.set("before", before)
    }
    const page = (await rest.get(Routes.channelMessages(channelId), {
      query,
    })) as APIMessage[]
    if (!Array.isArray(page) || page.length === 0) {
      break
    }
    scanned += page.length
    for (const message of page) {
      if (isHumanMessage(message)) {
        humans.push(toTranscriptMessage(message))
      }
    }
    const oldest = page[page.length - 1]
    if (!oldest || page.length < PAGE_LIMIT) {
      break
    }
    before = oldest.id
  }

  humans.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))
  return humans.slice(-needed)
}

export function chunkTranscript(lines: string[], maxChars = CHUNK_CHARS) {
  const chunks: string[][] = []
  let current: string[] = []
  let size = 0

  for (const line of lines) {
    const lineSize = line.length + 1
    if (current.length > 0 && size + lineSize > maxChars) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(line)
    size += lineSize
  }
  if (current.length > 0) {
    chunks.push(current)
  }
  return chunks
}

export function clampSummary(text: string, limit = EMBED_DESCRIPTION_LIMIT) {
  if (text.length <= limit) {
    return text
  }
  const head = text.slice(0, limit - 1)
  const cut = head.lastIndexOf(" ")
  return `${(cut > limit - 200 ? head.slice(0, cut) : head).trimEnd()}\u2026`
}

export function buildSummaryEmbed(summary: string, messages: TranscriptMessage[], t: TFunction, locale: Locale) {
  const first = messages[0]
  const last = messages[messages.length - 1]
  return {
    title: t(($) => $.summary.title),
    description: clampSummary(summary),
    color: SUMMARY_COLOR,
    footer: {
      text: t(($) => $.summary.footer, {
        count: messages.length,
        range:
          first && last
            ? t(($) => $.summary.range, {
                first: formatTime(first.timestamp, locale),
                last: formatTime(last.timestamp, locale),
              })
            : t(($) => $.summary.noTimeRange),
      }),
    },
    timestamp: new Date().toISOString(),
  }
}

export const SUMMARY_MODEL = "@cf/zai-org/glm-5.3-flash"

export const SUMMARY_REQUEST: Pick<
  Parameters<typeof generateText>[0],
  "maxRetries" | "temperature" | "topP" | "providerOptions"
> = {
  maxRetries: 2,
  // Shared by the summaries and the mention replies. At 1.0 the model misspelled its way
  // through short italian, and at 1.3 with top_p 0.95 both glm and mistral collapsed into
  // multilingual token salad: high temperature flattens the distribution until the nucleus
  // fills up with garbage. The invention comes from the prompts, not from the sampling.
  temperature: 0.8,
  topP: 0.9,
  providerOptions: { "workers-ai": { reasoning_effort: "low" } },
}

export function createSummarizer(ai: Env["AI"]) {
  return async (system: string, user: string) => {
    const trimmed = (
      await generateText({
        model: createWorkersAI({ binding: ai })(SUMMARY_MODEL),
        ...SUMMARY_REQUEST,
        instructions: system,
        messages: [{ role: "user", content: user }],
      })
    ).text.trim()
    if (trimmed.length === 0) {
      throw new Error("Workers AI returned an empty response")
    }
    return trimmed
  }
}

export async function summarizeWindow(
  summarize: SummaryDeps["summarize"],
  messages: TranscriptMessage[],
  prompts: SummaryPrompts = SUMMARY_PROMPTS,
) {
  const chunks = chunkTranscript(
    messages.map((message) => `[${formatTime(message.timestamp, "en")}] ${message.authorName}: ${message.content}`),
  )
  const single = chunks[0]
  if (chunks.length === 1 && single) {
    return summarize(prompts.single, `${single.join("\n")}\n${prompts.reminder}`)
  }

  const partials: string[] = []
  for (const chunk of chunks) {
    partials.push(await summarize(prompts.chunk, `${chunk.join("\n")}\n${prompts.reminder}`))
  }
  const merged = partials.map((partial, index) => `${prompts.part} ${index + 1}:\n${partial}`).join("\n\n")
  return summarize(prompts.merge, `${merged}\n${prompts.reminder}`)
}

function statusOf(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === "number") {
      return status
    }
  }
  return undefined
}

async function handleRestError(env: Env, channel: SummaryChannel, error: unknown) {
  const status = statusOf(error)
  if (status === 404) {
    console.warn(`Channel ${channel.channelId} is gone, removing its summary config`)
    await removeSummaryChannel(env.DB, channel.guildId, channel.channelId)
    return
  }
  if (status === 403) {
    console.warn(`Missing access to channel ${channel.channelId}, keeping its summary config`)
    return
  }
  console.error(`Failed to fetch messages for channel ${channel.channelId}`, error)
}

async function handlePostFailure(env: Env, channel: SummaryChannel, lastMessageId: string, error: unknown) {
  const status = statusOf(error)
  if (status === 404) {
    console.warn(`Channel ${channel.channelId} is gone, removing its summary config`)
    await removeSummaryChannel(env.DB, channel.guildId, channel.channelId)
    return
  }
  if (status === 403) {
    console.warn(`Missing access to channel ${channel.channelId}, keeping its summary config`)
    return
  }

  const failures = channel.failureCount + 1
  if (failures >= MAX_FAILURES) {
    console.error(`Skipping summary window in channel ${channel.channelId} after ${failures} failed attempts`, error)
    await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
      lastMessageId,
      failureCount: 0,
    })
    return
  }
  console.error(`Summary window failed for channel ${channel.channelId} (attempt ${failures}/${MAX_FAILURES})`, error)
  await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
    failureCount: failures,
  })
}

interface AiFailure {
  transient: boolean
  code?: number
  statusCode?: number
}

function workersAiErrorCodeOf(error: APICallError) {
  const data = error.data
  if (typeof data === "object" && data !== null && "workersAIErrorCode" in data) {
    const code = (data as { workersAIErrorCode?: unknown }).workersAIErrorCode
    if (typeof code === "number") {
      return code
    }
  }
  const match = /^(\d{3,5})\b/.exec(error.message)
  if (match) {
    return Number(match[1])
  }
  return undefined
}

function classifyAiFailure(error: unknown): AiFailure {
  if (!APICallError.isInstance(error)) {
    return { transient: false }
  }
  const code = workersAiErrorCodeOf(error)
  return {
    transient: error.isRetryable || (code !== undefined && TRANSIENT_AI_CODES.has(code)),
    code,
    statusCode: error.statusCode,
  }
}

function aiFailureDetail(failure: AiFailure, error: unknown) {
  const parts: string[] = []
  if (failure.code !== undefined) {
    parts.push(`code ${failure.code}`)
  }
  if (failure.statusCode !== undefined) {
    parts.push(`status ${failure.statusCode}`)
  }
  if (error instanceof Error && error.message.length > 0) {
    parts.push(error.message)
  }
  return parts.length === 0 ? "" : ` (${parts.join(", ")})`
}

async function handleAiFailure(
  env: Env,
  channel: SummaryChannel,
  lastMessageId: string,
  failure: AiFailure,
  error: unknown,
) {
  const detail = aiFailureDetail(failure, error)
  if (failure.transient) {
    console.warn(
      `Workers AI is temporarily unavailable for channel ${channel.channelId}${detail}, retrying next poll`,
      error,
    )
    return
  }

  const failures = channel.failureCount + 1
  if (failures >= AI_MAX_FAILURES) {
    console.error(
      `Skipping summary window in channel ${channel.channelId} after ${failures} failed attempts${detail}`,
      error,
    )
    await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
      lastMessageId,
      failureCount: 0,
    })
    return
  }
  console.error(
    `Summary failed for channel ${channel.channelId} (attempt ${failures}/${AI_MAX_FAILURES})${detail}`,
    error,
  )
  await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
    failureCount: failures,
  })
}

async function processChannel(env: Env, deps: SummaryDeps, channel: SummaryChannel) {
  const buffer: TranscriptMessage[] = []
  const nicknames = new Map<string, string | undefined>()
  let cursor = channel.lastMessageId
  let scanned = 0
  let posted = 0
  let exhausted = false

  while (posted < MAX_WINDOWS_PER_POLL) {
    if (buffer.length < channel.threshold) {
      if (exhausted) {
        return posted
      }
      let result: FetchResult
      try {
        result = await fetchHumans(
          deps.rest,
          channel.channelId,
          cursor,
          channel.threshold - buffer.length,
          SCAN_LIMIT - scanned,
        )
      } catch (error) {
        await handleRestError(env, channel, error)
        return posted
      }
      scanned += result.scanned
      buffer.push(...result.humans)
      exhausted = result.exhausted
      if (buffer.length < channel.threshold) {
        return posted
      }
    }

    const windowMessages = await applyGuildNicknames(
      deps.rest,
      channel.guildId,
      buffer.slice(0, channel.threshold),
      nicknames,
    )
    const lastMessage = windowMessages[windowMessages.length - 1]
    if (!lastMessage) {
      return posted
    }

    let summary: string
    try {
      summary = await summarizeWindow(deps.summarize, windowMessages)
    } catch (error) {
      await handleAiFailure(env, channel, lastMessage.id, classifyAiFailure(error), error)
      return posted
    }

    const settings = await getGuildSettings(env.DB, channel.guildId)
    const locale = normalizeLocale(settings?.locale ?? undefined)
    const t = createTranslator(locale)

    try {
      await deps.rest.post(Routes.channelMessages(channel.channelId), {
        body: {
          content: "@here #summary",
          embeds: [buildSummaryEmbed(summary, windowMessages, t, locale)],
        },
      })
    } catch (error) {
      await handlePostFailure(env, channel, lastMessage.id, error)
      return posted
    }

    await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
      lastMessageId: lastMessage.id,
      failureCount: 0,
    })
    cursor = lastMessage.id
    buffer.splice(0, channel.threshold)
    posted += 1
  }

  return posted
}

export async function runSummaryPoll(env: Env, deps: SummaryDeps) {
  const channels = await listSummaryChannels(env.DB)
  let processed = 0
  for (const channel of channels) {
    try {
      processed += await processChannel(env, deps, channel)
    } catch (error) {
      console.error(`Summary poll failed for channel ${channel.channelId}`, error)
    }
  }
  return { channels: channels.length, processed }
}

export interface ManualSummaryMessage {
  // Optional so messages already queued by an older deploy still route to this handler.
  kind?: "summary"
  guildId: string
  channelId: string
  needed: number
  token: string
  locale?: string
}

export interface ManualSummaryDeps extends SummaryDeps {
  applicationId: string
}

export async function runManualSummary(
  deps: SummaryDeps,
  guildId: string,
  channelId: string,
  needed: number,
  t: TFunction,
  locale: Locale,
) {
  try {
    const messages = await applyGuildNicknames(
      deps.rest,
      guildId,
      await fetchRecentHumans(deps.rest, channelId, needed),
    )
    if (messages.length === 0) {
      return { embeds: [{ color: ERROR_COLOR, description: t(($) => $.summary.noMessages) }] }
    }
    return {
      content: "#summary",
      embeds: [buildSummaryEmbed(await summarizeWindow(deps.summarize, messages), messages, t, locale)],
    }
  } catch (error) {
    console.error(`Manual summary failed for channel ${channelId}`, error)
    return {
      embeds: [
        {
          color: ERROR_COLOR,
          description: t(($) => $.summary.manualError),
        },
      ],
    }
  }
}

export async function deliverManualSummary(deps: ManualSummaryDeps, message: ManualSummaryMessage) {
  const locale = normalizeLocale(message.locale)
  const t = createTranslator(locale)
  const body = await runManualSummary(deps, message.guildId, message.channelId, message.needed, t, locale)
  await deps.rest.patch(Routes.webhookMessage(deps.applicationId, message.token, "@original"), {
    body,
  })
}
