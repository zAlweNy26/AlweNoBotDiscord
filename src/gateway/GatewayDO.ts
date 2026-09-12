import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import {
  DEFAULT_COUNTER_FORMAT,
  DEFAULT_FAREWELL_MESSAGE,
  DEFAULT_WELCOME_MESSAGE,
  getGuildSettings,
} from "../db";
import { createSummarizer, runSummaryPoll } from "../summary";
import { fillMessage } from "./messages";

const GATEWAY_URL = "wss://gateway.discord.gg";

const INTENTS_GUILDS = 1;
const INTENTS_GUILD_MEMBERS = 2;
const INTENTS = INTENTS_GUILDS | INTENTS_GUILD_MEMBERS;

const OP_DISPATCH = 0;
const OP_HEARTBEAT = 1;
const OP_IDENTIFY = 2;
const OP_PRESENCE_UPDATE = 3;
const OP_RESUME = 6;
const OP_RECONNECT = 7;
const OP_INVALID_SESSION = 9;
const OP_HELLO = 10;
const OP_HEARTBEAT_ACK = 11;

const RECONNECT_DELAY_MS = 5_000;
const COUNTER_DEBOUNCE_MS = 10 * 60 * 1_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 41_250;

const SESSION_INVALID_CODES = [4004, 4010, 4011, 4012, 4013, 4014];

export function toHttpUrl(url: string): string {
  return url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

interface GatewayMessage {
  op: number;
  s?: number | null;
  t?: string | null;
  d?: unknown;
}

interface ReadyData {
  session_id: string;
  resume_gateway_url?: string;
}

interface MemberEventData {
  guild_id: string;
  user: { id: string; username: string; bot?: boolean };
}

interface GuildWithCounts {
  approximate_member_count?: number;
}

export class GatewayDO {
  private socket: WebSocket | null = null;
  private connecting = false;
  private stateLoaded = false;
  private sessionId: string | null = null;
  private sequence: number | null = null;
  private resumeBase = GATEWAY_URL;
  private heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL_MS;
  private awaitingAck = false;
  private summaryPollRunning = false;
  private readonly rest: REST;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ensure") {
      await this.ensureConnected();
      return Response.json({ connected: this.isOpen(), session: this.sessionId !== null });
    }
    if (url.pathname === "/summary-poll") {
      if (this.summaryPollRunning) {
        return Response.json({ skipped: true });
      }
      this.summaryPollRunning = true;
      try {
        const result = await runSummaryPoll(this.env, {
          rest: this.rest,
          summarize: createSummarizer(this.env.AI),
        });
        return Response.json(result);
      } finally {
        this.summaryPollRunning = false;
      }
    }
    return new Response("Not Found", { status: 404 });
  }

  async alarm(): Promise<void> {
    if (this.awaitingAck) {
      await this.reconnect();
      return;
    }
    if (this.isOpen()) {
      this.awaitingAck = true;
      this.send({ op: OP_HEARTBEAT, d: this.sequence });
      await this.scheduleAlarm(this.heartbeatInterval);
      return;
    }
    await this.ensureConnected();
  }

  private isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private async ensureConnected(): Promise<void> {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (this.connecting) return;
    this.connecting = true;
    try {
      await this.loadState();
      const response = await fetch(`${toHttpUrl(this.resumeBase)}/?v=10&encoding=json`, {
        headers: { Upgrade: "websocket" },
      });
      const socket = response.webSocket;
      if (!socket) {
        throw new Error(`Gateway upgrade failed with status ${response.status}`);
      }
      socket.accept();
      this.socket = socket;
      socket.addEventListener("message", (event) => {
        void this.handleMessage(event.data);
      });
      socket.addEventListener("close", (event) => {
        void this.handleClose(event.code);
      });
      socket.addEventListener("error", () => {
        console.error("Gateway socket error");
      });
    } catch (error) {
      console.error("Gateway connection failed", error);
      this.socket = null;
      await this.scheduleAlarm(RECONNECT_DELAY_MS);
    } finally {
      this.connecting = false;
    }
  }

  private async handleMessage(raw: unknown): Promise<void> {
    let payload: GatewayMessage;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer);
      payload = JSON.parse(text) as GatewayMessage;
    } catch {
      return;
    }
    if (typeof payload.s === "number") {
      this.sequence = payload.s;
    }
    switch (payload.op) {
      case OP_HELLO: {
        const hello = payload.d as { heartbeat_interval?: number } | undefined;
        if (hello?.heartbeat_interval) {
          this.heartbeatInterval = hello.heartbeat_interval;
        }
        await this.startConnection();
        break;
      }
      case OP_HEARTBEAT:
        this.send({ op: OP_HEARTBEAT, d: this.sequence });
        break;
      case OP_HEARTBEAT_ACK:
        this.awaitingAck = false;
        break;
      case OP_RECONNECT:
        await this.reconnect();
        break;
      case OP_INVALID_SESSION:
        await this.resetSession();
        await this.reconnect();
        break;
      case OP_DISPATCH:
        await this.handleDispatch(payload.t ?? "", payload.d);
        break;
    }
  }

  private async startConnection(): Promise<void> {
    if (this.sessionId !== null && this.sequence !== null) {
      this.send({
        op: OP_RESUME,
        d: {
          token: this.env.DISCORD_TOKEN,
          session_id: this.sessionId,
          seq: this.sequence,
        },
      });
    } else {
      this.send({
        op: OP_IDENTIFY,
        d: {
          token: this.env.DISCORD_TOKEN,
          intents: INTENTS,
          properties: { os: "linux", browser: "alwenobot", device: "alwenobot" },
        },
      });
    }
    this.awaitingAck = false;
    await this.scheduleAlarm(this.heartbeatInterval);
  }

  private async handleDispatch(type: string, data: unknown): Promise<void> {
    switch (type) {
      case "READY": {
        const ready = data as ReadyData;
        this.sessionId = ready.session_id;
        if (ready.resume_gateway_url) {
          this.resumeBase = ready.resume_gateway_url;
        }
        await this.state.storage.put({
          sessionId: this.sessionId,
          sequence: this.sequence,
          resumeBase: this.resumeBase,
        });
        this.sendPresence();
        break;
      }
      case "GUILD_MEMBER_ADD":
        await this.handleMemberEvent("welcome", data as MemberEventData);
        break;
      case "GUILD_MEMBER_REMOVE":
        await this.handleMemberEvent("farewell", data as MemberEventData);
        break;
    }
  }

  private sendPresence(): void {
    this.send({
      op: OP_PRESENCE_UPDATE,
      d: {
        since: null,
        activities: [{ name: "/help", type: 0 }],
        status: "online",
        afk: false,
      },
    });
  }

  private async handleMemberEvent(
    kind: "welcome" | "farewell",
    event: MemberEventData,
  ): Promise<void> {
    if (event.user.bot) return;
    try {
      const settings = await getGuildSettings(this.env.DB, event.guild_id);
      if (!settings) return;
      const memberCount = await this.fetchMemberCount(event.guild_id);
      const enabled = kind === "welcome" ? settings.welcomeEnabled : settings.farewellEnabled;
      const channelId = kind === "welcome" ? settings.welcomeChannelId : settings.farewellChannelId;
      const template =
        (kind === "welcome" ? settings.welcomeMessage : settings.farewellMessage) ??
        (kind === "welcome" ? DEFAULT_WELCOME_MESSAGE : DEFAULT_FAREWELL_MESSAGE);

      if (enabled && channelId) {
        await this.rest.post(Routes.channelMessages(channelId), {
          body: { content: fillMessage(template, event.user, memberCount) },
        });
      }

      if (settings.counterEnabled && settings.counterChannelId) {
        const counterName = fillMessage(
          settings.counterFormat ?? DEFAULT_COUNTER_FORMAT,
          event.user,
          memberCount,
        );
        await this.updateCounter(settings.counterChannelId, counterName);
      }
    } catch (error) {
      console.error(`Failed to handle ${kind} for guild ${event.guild_id}`, error);
    }
  }

  private async fetchMemberCount(guildId: string): Promise<number | undefined> {
    const guild = (await this.rest.get(Routes.guild(guildId), {
      query: new URLSearchParams({ with_counts: "true" }),
    })) as GuildWithCounts;
    return guild.approximate_member_count;
  }

  private async updateCounter(channelId: string, name: string): Promise<void> {
    const key = `counter:${channelId}`;
    const last = await this.state.storage.get<number>(key);
    const now = Date.now();
    if (typeof last === "number" && now - last < COUNTER_DEBOUNCE_MS) {
      return;
    }
    await this.state.storage.put(key, now);
    await this.rest.patch(Routes.channel(channelId), { body: { name: name.slice(0, 100) } });
  }

  private send(payload: unknown): void {
    if (this.isOpen()) {
      this.socket?.send(JSON.stringify(payload));
    }
  }

  private async scheduleAlarm(delayMs: number): Promise<void> {
    await this.state.storage.setAlarm(Date.now() + delayMs);
  }

  private async loadState(): Promise<void> {
    if (this.stateLoaded) return;
    this.stateLoaded = true;
    this.sessionId = (await this.state.storage.get<string>("sessionId")) ?? null;
    this.sequence = (await this.state.storage.get<number>("sequence")) ?? null;
    this.resumeBase = (await this.state.storage.get<string>("resumeBase")) ?? GATEWAY_URL;
  }

  private async resetSession(): Promise<void> {
    this.sessionId = null;
    this.sequence = null;
    await this.state.storage.delete(["sessionId", "sequence"]);
  }

  private async handleClose(code: number): Promise<void> {
    this.socket = null;
    this.awaitingAck = false;
    if (SESSION_INVALID_CODES.includes(code)) {
      await this.resetSession();
    }
    await this.scheduleAlarm(RECONNECT_DELAY_MS);
  }

  private async reconnect(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    try {
      socket?.close(4000);
    } catch {
      // already closed
    }
    await this.scheduleAlarm(RECONNECT_DELAY_MS);
  }
}
