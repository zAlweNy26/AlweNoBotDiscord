import { type APIGuild, REST, Routes } from "discord.js"
import { getGuildSettings } from "../db"
import { createTranslator } from "../lib/i18n"
import { isMentionTrigger, type MentionMessage, replyToMention } from "../mention"
import { createSummarizer, runSummaryPoll } from "../summary"
import { fillMessage } from "./messages"

const GATEWAY_URL = "wss://gateway.discord.gg"

const INTENTS_GUILDS = 1
const INTENTS_GUILD_MEMBERS = 2
const INTENTS_GUILD_MESSAGES = 1 << 9
const INTENTS = INTENTS_GUILDS | INTENTS_GUILD_MEMBERS | INTENTS_GUILD_MESSAGES

const OP_DISPATCH = 0
const OP_HEARTBEAT = 1
const OP_IDENTIFY = 2
const OP_PRESENCE_UPDATE = 3
const OP_RESUME = 6
const OP_RECONNECT = 7
const OP_INVALID_SESSION = 9
const OP_HELLO = 10
const OP_HEARTBEAT_ACK = 11

const RECONNECT_BASE_MS = 5_000
const RECONNECT_MAX_MS = 5 * 60 * 1_000
const RECONNECT_ATTEMPTS_KEY = "reconnectAttempts"
const COUNTER_DEBOUNCE_MS = 10 * 60 * 1_000
const MENTION_COOLDOWN_MS = 60_000
const MENTION_DAILY_LIMIT = 100
const DEFAULT_HEARTBEAT_INTERVAL_MS = 41_250
const SESSION_INVALID_CODES = [4004, 4010, 4011, 4012, 4013, 4014]

export function toHttpUrl(url: string) {
  return url.replace(/^wss:/, "https:").replace(/^ws:/, "http:")
}

export function reconnectDelay(attempt: number, random: () => number = Math.random) {
  const capped = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS)
  return Math.round(capped * (0.5 + random() * 0.5))
}

export interface MentionUsage {
  lastUsedAt: number | undefined
  daily: { date: string; count: number } | undefined
}

export function checkMentionBudget(
  usage: MentionUsage,
  now: number,
  cooldownMs = MENTION_COOLDOWN_MS,
  dailyLimit = MENTION_DAILY_LIMIT,
) {
  const date = new Date(now).toISOString().slice(0, 10)
  const usedToday = usage.daily?.date === date ? usage.daily.count : 0
  if (usage.lastUsedAt !== undefined && now - usage.lastUsedAt < cooldownMs) {
    return { allowed: false, date, count: usedToday }
  }
  return { allowed: usedToday < dailyLimit, date, count: usedToday + 1 }
}

interface GatewayMessage {
  op: number
  s?: number | null
  t?: string | null
  d?: unknown
}

interface MemberEventData {
  guild_id: string
  user: { id: string; username: string; bot?: boolean }
}

export class GatewayDO {
  private socket: WebSocket | null = null
  private connecting = false
  private stateLoaded = false
  private sessionId: string | null = null
  private sessionIntents: number | null = null
  private sequence: number | null = null
  private resumeBase = GATEWAY_URL
  private heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL_MS
  private awaitingAck = false
  private summaryPollRunning = false
  private readonly rest: REST

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN)
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === "/ensure") {
      await this.ensureConnected()
      return Response.json({ connected: this.isOpen(), session: this.sessionId !== null })
    }
    if (url.pathname === "/summary-poll") {
      if (this.summaryPollRunning) {
        return Response.json({ skipped: true })
      }
      this.summaryPollRunning = true
      try {
        return Response.json(
          await runSummaryPoll(this.env, {
            rest: this.rest,
            summarize: createSummarizer(this.env.AI),
          }),
        )
      } finally {
        this.summaryPollRunning = false
      }
    }
    return new Response("Not Found", { status: 404 })
  }

  async alarm() {
    if (this.awaitingAck) {
      await this.reconnect()
      return
    }
    if (this.isOpen()) {
      this.awaitingAck = true
      this.send({ op: OP_HEARTBEAT, d: this.sequence })
      await this.scheduleAlarm(this.heartbeatInterval)
      return
    }
    await this.ensureConnected()
  }

  private isOpen() {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }

  private async ensureConnected() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }
    if (this.connecting) return
    this.connecting = true
    this.socket = null
    try {
      await this.loadState()
      const response = await fetch(`${toHttpUrl(this.resumeBase)}/?v=10&encoding=json`, {
        headers: { Upgrade: "websocket" },
      })
      const socket = response.webSocket
      if (!socket) {
        throw new Error(`Gateway upgrade failed with status ${response.status}`)
      }
      socket.accept()
      this.socket = socket
      socket.addEventListener("message", (event) => {
        if (this.socket !== socket) return
        void this.handleMessage(event.data)
      })
      socket.addEventListener("close", (event) => {
        if (this.socket !== socket) return
        void this.handleClose(event.code)
      })
      socket.addEventListener("error", () => {
        if (this.socket !== socket) return
        console.error("Gateway socket error")
      })
    } catch (error) {
      console.error("Gateway connection failed", error)
      this.socket = null
      await this.scheduleReconnect()
    } finally {
      this.connecting = false
    }
  }

  private async handleMessage(raw: unknown) {
    let payload: GatewayMessage
    try {
      payload = JSON.parse(
        typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer),
      ) as GatewayMessage
    } catch {
      return
    }
    if (typeof payload.s === "number") {
      this.sequence = payload.s
    }
    switch (payload.op) {
      case OP_HELLO: {
        const hello = payload.d as { heartbeat_interval?: number } | undefined
        if (hello?.heartbeat_interval) {
          this.heartbeatInterval = hello.heartbeat_interval
        }
        await this.startConnection()
        break
      }
      case OP_HEARTBEAT:
        this.send({ op: OP_HEARTBEAT, d: this.sequence })
        break
      case OP_HEARTBEAT_ACK:
        this.awaitingAck = false
        break
      case OP_RECONNECT:
        await this.reconnect()
        break
      case OP_INVALID_SESSION:
        await this.resetSession()
        await this.reconnect()
        break
      case OP_DISPATCH:
        await this.handleDispatch(payload.t ?? "", payload.d)
        break
    }
  }

  private async startConnection() {
    // Intents are frozen at IDENTIFY, so a session resumed across an intent change would
    // silently keep subscribing to the old events.
    if (this.sessionId !== null && this.sequence !== null && this.sessionIntents === INTENTS) {
      this.send({
        op: OP_RESUME,
        d: {
          token: this.env.DISCORD_TOKEN,
          session_id: this.sessionId,
          seq: this.sequence,
        },
      })
    } else {
      this.send({
        op: OP_IDENTIFY,
        d: {
          token: this.env.DISCORD_TOKEN,
          intents: INTENTS,
          properties: { os: "linux", browser: "alwenobot", device: "alwenobot" },
        },
      })
    }
    this.awaitingAck = false
    await this.state.storage.delete(RECONNECT_ATTEMPTS_KEY)
    await this.scheduleAlarm(this.heartbeatInterval)
  }

  private async handleDispatch(type: string, data: unknown) {
    switch (type) {
      case "READY": {
        const ready = data as { session_id: string; resume_gateway_url?: string }
        this.sessionId = ready.session_id
        this.sessionIntents = INTENTS
        if (ready.resume_gateway_url) {
          this.resumeBase = ready.resume_gateway_url
        }
        await this.state.storage.put({
          sessionId: this.sessionId,
          sessionIntents: this.sessionIntents,
          sequence: this.sequence,
          resumeBase: this.resumeBase,
        })
        this.sendPresence()
        break
      }
      case "GUILD_MEMBER_ADD":
        await this.handleMemberEvent("welcome", data as MemberEventData)
        break
      case "GUILD_MEMBER_REMOVE":
        await this.handleMemberEvent("farewell", data as MemberEventData)
        break
      case "MESSAGE_CREATE":
        await this.handleMention(data as MentionMessage)
        break
    }
  }

  private sendPresence() {
    this.send({
      op: OP_PRESENCE_UPDATE,
      d: {
        since: null,
        activities: [{ name: "/help", type: 0 }],
        status: "online",
        afk: false,
      },
    })
  }

  private async handleMention(message: MentionMessage) {
    if (!message.guild_id || !isMentionTrigger(message, this.env.DISCORD_APPLICATION_ID)) return
    try {
      const settings = await getGuildSettings(this.env.DB, message.guild_id)
      if (!settings?.mentionEnabled) return
      if (!(await this.allowMention(message.guild_id, message.author.id))) return
      await replyToMention(
        { rest: this.rest, summarize: createSummarizer(this.env.AI) },
        message,
        this.env.DISCORD_APPLICATION_ID,
      )
    } catch (error) {
      console.error(`Failed to answer a mention in channel ${message.channel_id}`, error)
    }
  }

  private async allowMention(guildId: string, userId: string) {
    const now = Date.now()
    const budget = checkMentionBudget(
      {
        lastUsedAt: await this.state.storage.get<number>(`mention-cooldown:${guildId}:${userId}`),
        daily: await this.state.storage.get<{ date: string; count: number }>(`mention-daily:${guildId}`),
      },
      now,
    )
    if (!budget.allowed) return false
    await this.state.storage.put(`mention-cooldown:${guildId}:${userId}`, now)
    await this.state.storage.put(`mention-daily:${guildId}`, { date: budget.date, count: budget.count })
    return true
  }

  private async handleMemberEvent(kind: "welcome" | "farewell", event: MemberEventData) {
    if (event.user.bot) return
    try {
      const settings = await getGuildSettings(this.env.DB, event.guild_id)
      if (!settings) return
      const t = createTranslator(settings.locale ?? undefined)
      const memberCount = await this.fetchMemberCount(event.guild_id)
      const channelId = kind === "welcome" ? settings.welcomeChannelId : settings.farewellChannelId

      if ((kind === "welcome" ? settings.welcomeEnabled : settings.farewellEnabled) && channelId) {
        const defaultMessage =
          kind === "welcome" ? t(($) => $.gateway.defaults.welcome) : t(($) => $.gateway.defaults.farewell)
        await this.rest.post(Routes.channelMessages(channelId), {
          body: {
            content: fillMessage(
              (kind === "welcome" ? settings.welcomeMessage : settings.farewellMessage) ?? defaultMessage,
              event.user,
              memberCount,
            ),
          },
        })
      }

      if (settings.counterEnabled && settings.counterChannelId) {
        await this.updateCounter(
          settings.counterChannelId,
          fillMessage(settings.counterFormat ?? t(($) => $.gateway.defaults.counter), event.user, memberCount),
        )
      }
    } catch (error) {
      console.error(`Failed to handle ${kind} for guild ${event.guild_id}`, error)
    }
  }

  private async fetchMemberCount(guildId: string) {
    return (
      (await this.rest.get(Routes.guild(guildId), {
        query: new URLSearchParams({ with_counts: "true" }),
      })) as APIGuild & { approximate_member_count?: number }
    ).approximate_member_count
  }

  private async updateCounter(channelId: string, name: string) {
    const key = `counter:${channelId}`
    const last = await this.state.storage.get<number>(key)
    const now = Date.now()
    if (typeof last === "number" && now - last < COUNTER_DEBOUNCE_MS) {
      return
    }
    await this.state.storage.put(key, now)
    await this.rest.patch(Routes.channel(channelId), { body: { name: name.slice(0, 100) } })
  }

  private send(payload: unknown) {
    if (this.isOpen()) {
      this.socket?.send(JSON.stringify(payload))
    }
  }

  private async scheduleAlarm(delayMs: number) {
    await this.state.storage.setAlarm(Date.now() + delayMs)
  }

  private async scheduleReconnect() {
    const attempts = (await this.state.storage.get<number>(RECONNECT_ATTEMPTS_KEY)) ?? 0
    await this.state.storage.put(RECONNECT_ATTEMPTS_KEY, attempts + 1)
    await this.scheduleAlarm(reconnectDelay(attempts))
  }

  private async loadState() {
    if (this.stateLoaded) return
    this.stateLoaded = true
    this.sessionId = (await this.state.storage.get<string>("sessionId")) ?? null
    this.sessionIntents = (await this.state.storage.get<number>("sessionIntents")) ?? null
    this.sequence = (await this.state.storage.get<number>("sequence")) ?? null
    this.resumeBase = (await this.state.storage.get<string>("resumeBase")) ?? GATEWAY_URL
  }

  private async resetSession() {
    this.sessionId = null
    this.sessionIntents = null
    this.sequence = null
    await this.state.storage.delete(["sessionId", "sessionIntents", "sequence"])
  }

  private async handleClose(code: number) {
    this.socket = null
    this.awaitingAck = false
    if (SESSION_INVALID_CODES.includes(code)) {
      await this.resetSession()
    }
    await this.scheduleReconnect()
  }

  private async reconnect() {
    const socket = this.socket
    this.socket = null
    try {
      socket?.close(4000)
    } catch {
      // already closed
    }
    await this.scheduleReconnect()
  }
}
