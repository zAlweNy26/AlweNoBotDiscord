import { env, runInDurableObject } from "cloudflare:test"
import { Routes } from "discord.js"
import { describe, expect, it, vi } from "vitest"
import {
  checkBudget,
  INTENTS,
  reconnectDelay,
  shouldInterfere,
  shouldResume,
  toHttpUrl,
} from "../src/gateway/GatewayDO"

describe("toHttpUrl", () => {
  it("converts wss URLs to https", () => {
    expect(toHttpUrl("wss://gateway.discord.gg")).toBe("https://gateway.discord.gg")
  })

  it("converts ws URLs to http", () => {
    expect(toHttpUrl("ws://gateway.discord.gg")).toBe("http://gateway.discord.gg")
  })

  it("leaves https URLs unchanged", () => {
    expect(toHttpUrl("https://gateway-us-east1-b.discord.gg")).toBe("https://gateway-us-east1-b.discord.gg")
  })

  it("preserves the path", () => {
    expect(toHttpUrl("wss://gateway.discord.gg/")).toBe("https://gateway.discord.gg/")
  })
})

describe("reconnectDelay", () => {
  it("backs off exponentially with full jitter at the cap", () => {
    expect(reconnectDelay(0, () => 1)).toBe(5_000)
    expect(reconnectDelay(1, () => 1)).toBe(10_000)
    expect(reconnectDelay(2, () => 1)).toBe(20_000)
  })

  it("caps the delay at five minutes", () => {
    expect(reconnectDelay(20, () => 1)).toBe(300_000)
  })

  it("applies the lower jitter bound", () => {
    expect(reconnectDelay(0, () => 0)).toBe(2_500)
  })
})

describe("checkBudget", () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0)

  it("allows the first mention of the day", () => {
    expect(checkBudget({ lastUsedAt: undefined, daily: undefined }, now)).toEqual({
      allowed: true,
      date: "2026-01-01",
      count: 1,
    })
  })

  it("blocks mentions inside the cooldown", () => {
    expect(checkBudget({ lastUsedAt: now - 30_000, daily: undefined }, now).allowed).toBe(false)
  })

  it("allows mentions once the cooldown is over", () => {
    expect(checkBudget({ lastUsedAt: now - 60_000, daily: undefined }, now).allowed).toBe(true)
  })

  it("blocks mentions when the daily limit is reached", () => {
    expect(checkBudget({ lastUsedAt: undefined, daily: { date: "2026-01-01", count: 100 } }, now).allowed).toBe(false)
  })

  it("resets the counter on a new day", () => {
    expect(checkBudget({ lastUsedAt: undefined, daily: { date: "2025-12-31", count: 100 } }, now)).toEqual({
      allowed: true,
      date: "2026-01-01",
      count: 1,
    })
  })

  it("counts the next mention of the day", () => {
    expect(checkBudget({ lastUsedAt: undefined, daily: { date: "2026-01-01", count: 4 } }, now).count).toBe(5)
  })
})

describe("shouldInterfere", () => {
  it("stays quiet when the roll lands at or above the chance", () => {
    expect(shouldInterfere(() => 1)).toBe(false)
    expect(shouldInterfere(() => 0.25)).toBe(false)
  })

  it("chimes in when the roll lands below the chance", () => {
    expect(shouldInterfere(() => 0)).toBe(true)
    expect(shouldInterfere(() => 0.24)).toBe(true)
  })
})

describe("INTENTS", () => {
  it("asks for message content so gateway messages carry their text", () => {
    expect(INTENTS & (1 << 15)).toBe(1 << 15)
  })
})

describe("shouldResume", () => {
  it("resumes a stored session identified with the current intents", () => {
    expect(shouldResume({ sessionId: "s", sequence: 1, sessionIntents: INTENTS })).toBe(true)
  })

  it("identifies again without a session or a sequence", () => {
    expect(shouldResume({ sessionId: null, sequence: 1, sessionIntents: INTENTS })).toBe(false)
    expect(shouldResume({ sessionId: "s", sequence: null, sessionIntents: INTENTS })).toBe(false)
  })

  it("identifies again when the intents changed", () => {
    expect(shouldResume({ sessionId: "s", sequence: 1, sessionIntents: 1 })).toBe(false)
    expect(shouldResume({ sessionId: "s", sequence: 1, sessionIntents: null })).toBe(false)
  })
})

interface GatewayInternals {
  socket: unknown
  sequence: number | null
  rest: unknown
  alarm(): Promise<void>
  updateCounter(channelId: string, name: string): Promise<void>
}

async function withOpenGateway(
  name: string,
  run: (gateway: GatewayInternals, state: DurableObjectState) => Promise<void>,
) {
  const namespace = (env as unknown as Env).GATEWAY
  await runInDurableObject(namespace.get(namespace.idFromName(name)), async (instance, state) => {
    const gateway = instance as unknown as GatewayInternals
    gateway.socket = { readyState: WebSocket.OPEN, send: vi.fn() }
    try {
      await run(gateway, state)
    } finally {
      await state.storage.deleteAlarm()
    }
  })
}

describe("GatewayDO heartbeat", () => {
  it("stores the latest sequence so a restart resumes from it", async () => {
    await withOpenGateway("sequence", async (gateway, state) => {
      gateway.sequence = 42
      await gateway.alarm()
      expect(await state.storage.get("sequence")).toBe(42)
    })
  })

  it("applies a counter update that landed inside the debounce window", async () => {
    await withOpenGateway("counter", async (gateway, state) => {
      const patch = vi.fn(async () => ({}))
      gateway.rest = { patch }
      await gateway.updateCounter("channel", "Members: 1")
      await gateway.updateCounter("channel", "Members: 3")
      expect(patch).toHaveBeenCalledTimes(1)

      await state.storage.put("counter:channel", Date.now() - 11 * 60 * 1_000)
      await gateway.alarm()

      expect(patch).toHaveBeenCalledTimes(2)
      expect(patch).toHaveBeenLastCalledWith(Routes.channel("channel"), { body: { name: "Members: 3" } })
    })
  })
})
