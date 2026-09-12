import type { REST } from "@discordjs/rest";
import { generateText } from "ai";
import { type APIEmbed, type APIMessage, Routes } from "discord-api-types/v10";
import { createWorkersAI } from "workers-ai-provider";
import {
  listSummaryChannels,
  removeSummaryChannel,
  type SummaryChannel,
  updateSummaryProgress,
} from "./db";

const MODEL = "@cf/zai-org/glm-4.7-flash";
const SUMMARY_TITLE = "📝 Riepilogo";
const SUMMARY_COLOR = 0x5865f2;
const MAX_WINDOWS_PER_POLL = 3;
const MAX_FAILURES = 3;
const PAGE_LIMIT = 100;
const SCAN_LIMIT = 2_000;
const CHUNK_CHARS = 100_000;

const FINAL_PROMPT = [
  "Sei un assistente che riassume conversazioni Discord.",
  "Riassumi in italiano i messaggi che seguono, in modo conciso e fedele, senza inventare informazioni.",
  "Usa al massimo 2000 caratteri. Rispondi solo con il riassunto.",
].join(" ");

const MAP_PROMPT = [
  "Sei un assistente che riassume conversazioni Discord.",
  "Riassumi in italiano questo estratto di conversazione, in modo conciso e fedele, senza inventare informazioni.",
  "Rispondi solo con il riassunto.",
].join(" ");

const MERGE_PROMPT = [
  "Sei un assistente che riassume conversazioni Discord.",
  "Unisci i riassunti parziali che seguono in un unico riassunto in italiano, conciso e fedele, senza inventare informazioni.",
  "Usa al massimo 2000 caratteri. Rispondi solo con il riassunto.",
].join(" ");

const TIME_FORMAT = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export interface SummaryDeps {
  rest: REST;
  summarize: (system: string, user: string) => Promise<string>;
}

export interface TranscriptMessage {
  id: string;
  timestamp: string;
  authorName: string;
  content: string;
}

interface FetchResult {
  humans: TranscriptMessage[];
  scanned: number;
  exhausted: boolean;
}

export interface SummaryPollResult {
  channels: number;
  processed: number;
}

export function isHumanMessage(message: APIMessage): boolean {
  return !message.author.bot && !message.webhook_id && message.content.trim().length > 0;
}

function toTranscriptMessage(message: APIMessage): TranscriptMessage {
  return {
    id: message.id,
    timestamp: message.timestamp,
    authorName: message.author.global_name ?? message.author.username,
    content: message.content,
  };
}

function formatTime(timestamp: string): string {
  return TIME_FORMAT.format(new Date(timestamp));
}

async function fetchHumans(
  rest: REST,
  channelId: string,
  afterId: string,
  needed: number,
  budget: number,
): Promise<FetchResult> {
  const humans: TranscriptMessage[] = [];
  let cursor = afterId;
  let scanned = 0;
  let exhausted = false;

  while (humans.length < needed && scanned < budget && !exhausted) {
    const page = (await rest.get(Routes.channelMessages(channelId), {
      query: new URLSearchParams({ after: cursor, limit: String(PAGE_LIMIT) }),
    })) as APIMessage[];
    if (!Array.isArray(page) || page.length === 0) {
      exhausted = true;
      break;
    }
    scanned += page.length;
    for (const message of page) {
      if (isHumanMessage(message)) {
        humans.push(toTranscriptMessage(message));
      }
    }
    const newest = page[0];
    if (!newest) {
      exhausted = true;
      break;
    }
    cursor = newest.id;
    if (page.length < PAGE_LIMIT) {
      exhausted = true;
    }
  }

  humans.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  return { humans, scanned, exhausted };
}

export interface SummaryStatus {
  counted: number;
  ready: boolean;
}

export async function getSummaryStatus(
  rest: REST,
  channel: SummaryChannel,
): Promise<SummaryStatus> {
  const result = await fetchHumans(
    rest,
    channel.channelId,
    channel.lastMessageId,
    channel.threshold,
    SCAN_LIMIT,
  );
  return {
    counted: Math.min(result.humans.length, channel.threshold),
    ready: result.humans.length >= channel.threshold,
  };
}

export function chunkTranscript(lines: string[], maxChars = CHUNK_CHARS): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;

  for (const line of lines) {
    const lineSize = line.length + 1;
    if (current.length > 0 && size + lineSize > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += lineSize;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

export function buildSummaryEmbed(summary: string, messages: TranscriptMessage[]): APIEmbed {
  const first = messages[0];
  const last = messages[messages.length - 1];
  const range =
    first && last
      ? `from ${formatTime(first.timestamp)} to ${formatTime(last.timestamp)}`
      : "no time range";
  return {
    title: SUMMARY_TITLE,
    description: summary,
    color: SUMMARY_COLOR,
    footer: { text: `${messages.length} messages · ${range}` },
    timestamp: new Date().toISOString(),
  };
}

export function createSummarizer(ai: Env["AI"]): SummaryDeps["summarize"] {
  const workersai = createWorkersAI({ binding: ai });
  return async (system, user) => {
    const { text } = await generateText({
      model: workersai(MODEL),
      maxRetries: 0,
      instructions: system,
      messages: [{ role: "user", content: user }],
    });
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error("Workers AI returned an empty response");
    }
    return trimmed;
  };
}

async function summarizeWindow(
  summarize: SummaryDeps["summarize"],
  messages: TranscriptMessage[],
): Promise<string> {
  const lines = messages.map(
    (message) => `[${formatTime(message.timestamp)}] ${message.authorName}: ${message.content}`,
  );
  const chunks = chunkTranscript(lines);
  const single = chunks[0];
  if (chunks.length === 1 && single) {
    return summarize(FINAL_PROMPT, single.join("\n"));
  }

  const partials: string[] = [];
  for (const chunk of chunks) {
    partials.push(await summarize(MAP_PROMPT, chunk.join("\n")));
  }
  const merged = partials.map((partial, index) => `Parte ${index + 1}:\n${partial}`).join("\n\n");
  return summarize(MERGE_PROMPT, merged);
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return undefined;
}

async function handleRestError(env: Env, channel: SummaryChannel, error: unknown): Promise<void> {
  const status = statusOf(error);
  if (status === 404) {
    console.warn(`Channel ${channel.channelId} is gone, removing its summary config`);
    await removeSummaryChannel(env.DB, channel.guildId, channel.channelId);
    return;
  }
  if (status === 403) {
    console.warn(`Missing access to channel ${channel.channelId}, keeping its summary config`);
    return;
  }
  console.error(`Failed to fetch messages for channel ${channel.channelId}`, error);
}

async function handleWindowFailure(
  env: Env,
  channel: SummaryChannel,
  lastMessageId: string,
  error: unknown,
): Promise<void> {
  const status = statusOf(error);
  if (status === 404) {
    console.warn(`Channel ${channel.channelId} is gone, removing its summary config`);
    await removeSummaryChannel(env.DB, channel.guildId, channel.channelId);
    return;
  }
  if (status === 403) {
    console.warn(`Missing access to channel ${channel.channelId}, keeping its summary config`);
    return;
  }

  const failures = channel.failureCount + 1;
  if (failures >= MAX_FAILURES) {
    console.error(
      `Skipping summary window in channel ${channel.channelId} after ${failures} failed attempts`,
      error,
    );
    await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
      lastMessageId,
      failureCount: 0,
    });
    return;
  }
  console.error(
    `Summary window failed for channel ${channel.channelId} (attempt ${failures}/${MAX_FAILURES})`,
    error,
  );
  await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
    failureCount: failures,
  });
}

async function processChannel(
  env: Env,
  deps: SummaryDeps,
  channel: SummaryChannel,
): Promise<number> {
  const buffer: TranscriptMessage[] = [];
  let cursor = channel.lastMessageId;
  let scanned = 0;
  let posted = 0;
  let exhausted = false;

  while (posted < MAX_WINDOWS_PER_POLL) {
    if (buffer.length < channel.threshold) {
      if (exhausted) {
        return posted;
      }
      let result: FetchResult;
      try {
        result = await fetchHumans(
          deps.rest,
          channel.channelId,
          cursor,
          channel.threshold - buffer.length,
          SCAN_LIMIT - scanned,
        );
      } catch (error) {
        await handleRestError(env, channel, error);
        return posted;
      }
      scanned += result.scanned;
      buffer.push(...result.humans);
      exhausted = result.exhausted;
      if (buffer.length < channel.threshold) {
        return posted;
      }
    }

    const windowMessages = buffer.slice(0, channel.threshold);
    const lastMessage = windowMessages[windowMessages.length - 1];
    if (!lastMessage) {
      return posted;
    }

    try {
      const summary = await summarizeWindow(deps.summarize, windowMessages);
      await deps.rest.post(Routes.channelMessages(channel.channelId), {
        body: { embeds: [buildSummaryEmbed(summary, windowMessages)] },
      });
    } catch (error) {
      await handleWindowFailure(env, channel, lastMessage.id, error);
      return posted;
    }

    await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
      lastMessageId: lastMessage.id,
      failureCount: 0,
    });
    cursor = lastMessage.id;
    buffer.splice(0, channel.threshold);
    posted += 1;
  }

  return posted;
}

export async function runSummaryPoll(env: Env, deps: SummaryDeps): Promise<SummaryPollResult> {
  const channels = await listSummaryChannels(env.DB);
  let processed = 0;
  for (const channel of channels) {
    try {
      processed += await processChannel(env, deps, channel);
    } catch (error) {
      console.error(`Summary poll failed for channel ${channel.channelId}`, error);
    }
  }
  return { channels: channels.length, processed };
}
