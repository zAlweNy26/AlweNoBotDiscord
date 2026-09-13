import { APICallError, generateText } from "ai";
import { type APIMessage, type REST, Routes } from "discord.js";
import { createWorkersAI } from "workers-ai-provider";
import {
  listSummaryChannels,
  removeSummaryChannel,
  type SummaryChannel,
  updateSummaryProgress,
} from "./db";
import { ERROR_COLOR } from "./respond";

const MAX_FAILURES = 3;
const AI_MAX_FAILURES = 10;
const MAX_WINDOWS_PER_POLL = 3;
const PAGE_LIMIT = 100;
const SCAN_LIMIT = 2_000;
const CHUNK_CHARS = 100_000;
const SUMMARY_COLOR = 0x5865f2;

const SUMMARY_PERSONA = [
  "Sei il Cronista di questo server Discord: hai letto così tanti messaggi che ormai niente ti stupisce, ma ti diverti ancora a raccontare il caos quotidiano.",
  "Scrivi in italiano con ironia pungente ma affettuosa: prendi in giro il gruppo e i suoi protagonisti senza cattiveria gratuita, insulti o attacchi personali.",
  "Puoi nominare le persone e sfotterle per quello che hanno scritto, ma solo per cose davvero presenti nei messaggi.",
  "Fedeltà ai fatti: basati esclusivamente sui messaggi forniti, non inventare eventi, citazioni, decisioni, piani o drammi che non ci sono.",
  "Se qualcosa è ambiguo o è rimasto in sospeso, dillo o omettilo, non riempire i vuoti.",
  "Non attribuire frasi o intenzioni a chi non le ha scritte.",
  "Lascia perdere salute, aspetto fisico, famiglia e altri temi sensibili.",
  "Rispondi solo con il riassunto, senza preamboli.",
].join(" ");

const SINGLE_SUMMARY_PROMPT = [
  SUMMARY_PERSONA,
  "Racconta la conversazione che segue in ordine cronologico: cosa è successo, chi ha detto le cose che contano, cosa è rimasto irrisolto.",
  "Apri e chiudi con un commento del Cronista.",
  "Massimo 2000 caratteri.",
].join(" ");

const MERGE_SUMMARY_PROMPT = [
  SUMMARY_PERSONA,
  "I blocchi che seguono sono i riassunti parziali di una conversazione molto lunga.",
  "Uniscili in un unico racconto coerente e cronologico, con la stessa voce, senza aggiungere nulla che non fosse già nei parziali.",
  "Massimo 2000 caratteri.",
].join(" ");

const CHUNK_SUMMARY_PROMPT = [
  "Sei un assistente che estrae i fatti da conversazioni Discord.",
  "Riassumi in italiano questo estratto in modo neutro e conciso: riporta solo fatti, richieste, decisioni, domande e nomi realmente presenti.",
  "Non inventare nulla e non commentare.",
  "Rispondi solo con il riassunto.",
].join(" ");

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

export function isHumanMessage(message: APIMessage) {
  return !message.author.bot && !message.webhook_id && message.content.trim().length > 0;
}

function toTranscriptMessage(message: APIMessage) {
  return {
    id: message.id,
    timestamp: message.timestamp,
    authorName: message.author.global_name ?? message.author.username,
    content: message.content,
  };
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(timestamp));
}

async function fetchHumans(
  rest: REST,
  channelId: string,
  afterId: string,
  needed: number,
  budget: number,
) {
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

export async function getSummaryStatus(rest: REST, channel: SummaryChannel) {
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

export async function fetchRecentHumans(
  rest: REST,
  channelId: string,
  needed: number,
  budget = SCAN_LIMIT,
) {
  const humans: TranscriptMessage[] = [];
  let before: string | undefined;
  let scanned = 0;

  while (humans.length < needed && scanned < budget) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (before) {
      query.set("before", before);
    }
    const page = (await rest.get(Routes.channelMessages(channelId), {
      query,
    })) as APIMessage[];
    if (!Array.isArray(page) || page.length === 0) {
      break;
    }
    scanned += page.length;
    for (const message of page) {
      if (isHumanMessage(message)) {
        humans.push(toTranscriptMessage(message));
      }
    }
    const oldest = page[page.length - 1];
    if (!oldest || page.length < PAGE_LIMIT) {
      break;
    }
    before = oldest.id;
  }

  humans.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  return humans.slice(-needed);
}

export function chunkTranscript(lines: string[], maxChars = CHUNK_CHARS) {
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

export function buildSummaryEmbed(summary: string, messages: TranscriptMessage[]) {
  const first = messages[0];
  const last = messages[messages.length - 1];
  return {
    title: "📝 Riepilogo",
    description: summary,
    color: SUMMARY_COLOR,
    footer: {
      text: `${messages.length} messages · ${
        first && last
          ? `from ${formatTime(first.timestamp)} to ${formatTime(last.timestamp)}`
          : "no time range"
      }`,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createSummarizer(ai: Env["AI"]) {
  return async (system: string, user: string) => {
    const trimmed = (
      await generateText({
        model: createWorkersAI({ binding: ai })("@cf/zai-org/glm-4.7-flash"),
        maxRetries: 2,
        instructions: system,
        messages: [{ role: "user", content: user }],
      })
    ).text.trim();
    if (trimmed.length === 0) {
      throw new Error("Workers AI returned an empty response");
    }
    return trimmed;
  };
}

export async function summarizeWindow(
  summarize: SummaryDeps["summarize"],
  messages: TranscriptMessage[],
) {
  const chunks = chunkTranscript(
    messages.map(
      (message) => `[${formatTime(message.timestamp)}] ${message.authorName}: ${message.content}`,
    ),
  );
  const single = chunks[0];
  if (chunks.length === 1 && single) {
    return summarize(SINGLE_SUMMARY_PROMPT, single.join("\n"));
  }

  const partials: string[] = [];
  for (const chunk of chunks) {
    partials.push(await summarize(CHUNK_SUMMARY_PROMPT, chunk.join("\n")));
  }
  return summarize(
    MERGE_SUMMARY_PROMPT,
    partials.map((partial, index) => `Parte ${index + 1}:\n${partial}`).join("\n\n"),
  );
}

function statusOf(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return undefined;
}

async function handleRestError(env: Env, channel: SummaryChannel, error: unknown) {
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

async function handlePostFailure(
  env: Env,
  channel: SummaryChannel,
  lastMessageId: string,
  error: unknown,
) {
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

interface AiFailure {
  transient: boolean;
  code?: number;
  statusCode?: number;
}

function workersAiErrorCodeOf(error: APICallError) {
  const data = error.data;
  if (typeof data === "object" && data !== null && "workersAIErrorCode" in data) {
    const code = (data as { workersAIErrorCode?: unknown }).workersAIErrorCode;
    if (typeof code === "number") {
      return code;
    }
  }
  return undefined;
}

function classifyAiFailure(error: unknown): AiFailure {
  if (!APICallError.isInstance(error)) {
    return { transient: false };
  }
  return {
    transient: error.isRetryable,
    code: workersAiErrorCodeOf(error),
    statusCode: error.statusCode,
  };
}

function aiFailureDetail(failure: AiFailure) {
  const parts: string[] = [];
  if (failure.code !== undefined) {
    parts.push(`code ${failure.code}`);
  }
  if (failure.statusCode !== undefined) {
    parts.push(`status ${failure.statusCode}`);
  }
  return parts.length === 0 ? "" : ` (${parts.join(", ")})`;
}

async function handleAiFailure(
  env: Env,
  channel: SummaryChannel,
  lastMessageId: string,
  failure: AiFailure,
  error: unknown,
) {
  const detail = aiFailureDetail(failure);
  if (failure.transient) {
    console.warn(
      `Workers AI is temporarily unavailable for channel ${channel.channelId}${detail}, retrying next poll`,
      error,
    );
    return;
  }

  const failures = channel.failureCount + 1;
  if (failures >= AI_MAX_FAILURES) {
    console.error(
      `Skipping summary window in channel ${channel.channelId} after ${failures} failed attempts${detail}`,
      error,
    );
    await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
      lastMessageId,
      failureCount: 0,
    });
    return;
  }
  console.error(
    `Summary failed for channel ${channel.channelId} (attempt ${failures}/${AI_MAX_FAILURES})${detail}`,
    error,
  );
  await updateSummaryProgress(env.DB, channel.guildId, channel.channelId, {
    failureCount: failures,
  });
}

async function processChannel(env: Env, deps: SummaryDeps, channel: SummaryChannel) {
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

    let summary: string;
    try {
      summary = await summarizeWindow(deps.summarize, windowMessages);
    } catch (error) {
      await handleAiFailure(env, channel, lastMessage.id, classifyAiFailure(error), error);
      return posted;
    }

    try {
      await deps.rest.post(Routes.channelMessages(channel.channelId), {
        body: {
          content: "@here #summary",
          embeds: [buildSummaryEmbed(summary, windowMessages)],
        },
      });
    } catch (error) {
      await handlePostFailure(env, channel, lastMessage.id, error);
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

export async function runSummaryPoll(env: Env, deps: SummaryDeps) {
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

export interface ManualSummaryMessage {
  channelId: string;
  needed: number;
  token: string;
}

export interface ManualSummaryDeps extends SummaryDeps {
  applicationId: string;
}

export async function runManualSummary(deps: SummaryDeps, channelId: string, needed: number) {
  try {
    const messages = await fetchRecentHumans(deps.rest, channelId, needed);
    if (messages.length === 0) {
      return { embeds: [{ color: ERROR_COLOR, description: "No messages found to summarize." }] };
    }
    return {
      content: "#summary",
      embeds: [buildSummaryEmbed(await summarizeWindow(deps.summarize, messages), messages)],
    };
  } catch (error) {
    console.error(`Manual summary failed for channel ${channelId}`, error);
    return {
      embeds: [
        {
          color: ERROR_COLOR,
          description: "Couldn't create the summary. Please try again later.",
        },
      ],
    };
  }
}

export async function deliverManualSummary(deps: ManualSummaryDeps, message: ManualSummaryMessage) {
  const body = await runManualSummary(deps, message.channelId, message.needed);
  await deps.rest.patch(Routes.webhookMessage(deps.applicationId, message.token, "@original"), {
    body,
  });
}
