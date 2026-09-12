import { env } from "cloudflare:test";
import type { REST } from "@discordjs/rest";
import type { APIEmbed, APIMessage } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addSummaryChannel, getSummaryChannel, updateSummaryProgress } from "../src/db";
import {
  buildSummaryEmbed,
  chunkTranscript,
  runSummaryPoll,
  type SummaryDeps,
} from "../src/summary";

interface FakeMessage {
  id: string;
  content: string;
  bot?: boolean;
  webhook?: boolean;
  username?: string;
  timestamp?: string;
}

function toApiMessage(message: FakeMessage): APIMessage {
  return {
    id: message.id,
    content: message.content,
    timestamp: message.timestamp ?? "2026-01-01T10:00:00.000Z",
    author: { id: "1", username: message.username ?? "user", bot: message.bot },
    ...(message.webhook ? { webhook_id: "42" } : {}),
  } as unknown as APIMessage;
}

function createRest(messages: FakeMessage[]) {
  const posted: Array<{ body: { embeds: APIEmbed[] } }> = [];
  const get = vi.fn(async (_route: string, options: { query: URLSearchParams }) => {
    const after = options.query.get("after") ?? "0";
    const limit = Number(options.query.get("limit") ?? "100");
    const page = messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => BigInt(message.id) > BigInt(after))
      .sort((a, b) => (BigInt(a.message.id) < BigInt(b.message.id) ? -1 : 1))
      .slice(0, limit)
      .map(({ message }) => toApiMessage(message))
      .reverse();
    return page;
  });
  const post = vi.fn(async (_route: string, options: { body: { embeds: APIEmbed[] } }) => {
    posted.push(options);
    return {};
  });
  const rest = { get, post } as unknown as REST;
  return { rest, posted };
}

function createAi(reply = "riassunto") {
  return {
    run: vi.fn(async () => ({ response: reply })),
  };
}

function deps(rest: REST, ai: ReturnType<typeof createAi>): SummaryDeps {
  return { rest, ai: ai as unknown as Env["AI"] };
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM summary_channels").run();
});

describe("chunkTranscript", () => {
  it("splits only on line boundaries without dropping content", () => {
    const lines = ["a".repeat(60_000), "b".repeat(60_000), "c".repeat(60_000)];
    const chunks = chunkTranscript(lines, 100_000);
    expect(chunks).toHaveLength(3);
    expect(chunks.flat().join("\n")).toBe(lines.join("\n"));
  });

  it("never splits a line that is longer than the limit", () => {
    const line = "x".repeat(120_000);
    expect(chunkTranscript([line], 100_000)).toEqual([[line]]);
  });
});

describe("buildSummaryEmbed", () => {
  it("uses a compact english footer with the time range", () => {
    const embed = buildSummaryEmbed("ciao", [
      { id: "1", timestamp: "2026-01-01T10:00:00.000Z", authorName: "a", content: "x" },
      { id: "2", timestamp: "2026-01-01T11:00:00.000Z", authorName: "b", content: "y" },
    ]);
    expect(embed.footer?.text).toBe("2 messages · from 11:00 to 12:00");
  });
});

describe("runSummaryPoll", () => {
  it("does nothing when the threshold is not reached", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const { rest, posted } = createRest([{ id: "100", content: "hello" }]);
    const result = await runSummaryPoll(env as unknown as Env, deps(rest, createAi()));

    expect(result.processed).toBe(0);
    expect(posted).toHaveLength(0);
    expect((await getSummaryChannel(env.DB, "guild", "channel"))?.lastMessageId).toBe("0");
  });

  it("ignores bots, webhooks and empty messages", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const { rest, posted } = createRest([
      { id: "100", content: "first" },
      { id: "101", content: "bot", bot: true },
      { id: "102", content: "hook", webhook: true },
      { id: "103", content: "   " },
      { id: "104", content: "second" },
    ]);
    await runSummaryPoll(env as unknown as Env, deps(rest, createAi()));

    expect(posted).toHaveLength(1);
    expect((await getSummaryChannel(env.DB, "guild", "channel"))?.lastMessageId).toBe("104");
  });

  it("posts a summary and advances the pointer", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const { rest, posted } = createRest([
      { id: "100", content: "first" },
      { id: "101", content: "second" },
      { id: "102", content: "third" },
    ]);
    const result = await runSummaryPoll(env as unknown as Env, deps(rest, createAi()));

    expect(result.processed).toBe(1);
    expect(posted).toHaveLength(1);
    expect(posted[0]?.body.embeds[0]?.description).toBe("riassunto");
    expect((await getSummaryChannel(env.DB, "guild", "channel"))?.lastMessageId).toBe("101");
  });

  it("processes at most three windows per poll", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const messages: FakeMessage[] = Array.from({ length: 7 }, (_, index) => ({
      id: String(100 + index),
      content: `message ${index}`,
    }));
    const { rest, posted } = createRest(messages);
    const result = await runSummaryPoll(env as unknown as Env, deps(rest, createAi()));

    expect(result.processed).toBe(3);
    expect(posted).toHaveLength(3);
    expect((await getSummaryChannel(env.DB, "guild", "channel"))?.lastMessageId).toBe("105");
  });

  it("keeps the pointer and counts the failure when AI fails", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const { rest, posted } = createRest([
      { id: "100", content: "first" },
      { id: "101", content: "second" },
    ]);
    const ai = { run: vi.fn(async () => Promise.reject(new Error("ai down"))) };
    await runSummaryPoll(env as unknown as Env, deps(rest, ai));

    expect(posted).toHaveLength(0);
    const row = await getSummaryChannel(env.DB, "guild", "channel");
    expect(row?.lastMessageId).toBe("0");
    expect(row?.failureCount).toBe(1);
  });

  it("skips the window after three consecutive failures", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    await updateSummaryProgress(env.DB, "guild", "channel", { failureCount: 2 });
    const { rest, posted } = createRest([
      { id: "100", content: "first" },
      { id: "101", content: "second" },
    ]);
    const ai = { run: vi.fn(async () => Promise.reject(new Error("ai down"))) };
    await runSummaryPoll(env as unknown as Env, deps(rest, ai));

    expect(posted).toHaveLength(0);
    const row = await getSummaryChannel(env.DB, "guild", "channel");
    expect(row?.lastMessageId).toBe("101");
    expect(row?.failureCount).toBe(0);
  });

  it("deletes the config when the channel is gone (404)", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const get = vi.fn(async () => {
      throw Object.assign(new Error("Unknown Channel"), { status: 404 });
    });
    const rest = { get, post: vi.fn() } as unknown as REST;
    await runSummaryPoll(env as unknown as Env, deps(rest, createAi()));

    expect(await getSummaryChannel(env.DB, "guild", "channel")).toBeNull();
  });

  it("keeps the config when access is denied (403)", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 2, "0");
    const get = vi.fn(async () => {
      throw Object.assign(new Error("Missing Access"), { status: 403 });
    });
    const rest = { get, post: vi.fn() } as unknown as REST;
    await runSummaryPoll(env as unknown as Env, deps(rest, createAi()));

    expect(await getSummaryChannel(env.DB, "guild", "channel")).not.toBeNull();
  });

  it("chunks and merges very long windows", async () => {
    await addSummaryChannel(env.DB, "guild", "channel", 11, "0");
    const messages: FakeMessage[] = Array.from({ length: 11 }, (_, index) => ({
      id: String(100 + index),
      content: "x".repeat(10_000),
    }));
    const { rest, posted } = createRest(messages);
    const ai = createAi();
    await runSummaryPoll(env as unknown as Env, deps(rest, ai));

    expect(posted).toHaveLength(1);
    expect(ai.run).toHaveBeenCalledTimes(3);
  });
});
