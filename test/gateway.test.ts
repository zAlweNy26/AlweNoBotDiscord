import { describe, expect, it } from "vitest"
import { checkMentionBudget, reconnectDelay, toHttpUrl } from "../src/gateway/GatewayDO"

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

describe("checkMentionBudget", () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0)

  it("allows the first mention of the day", () => {
    expect(checkMentionBudget({ lastUsedAt: undefined, daily: undefined }, now)).toEqual({
      allowed: true,
      date: "2026-01-01",
      count: 1,
    })
  })

  it("blocks mentions inside the cooldown", () => {
    expect(checkMentionBudget({ lastUsedAt: now - 30_000, daily: undefined }, now).allowed).toBe(false)
  })

  it("allows mentions once the cooldown is over", () => {
    expect(checkMentionBudget({ lastUsedAt: now - 60_000, daily: undefined }, now).allowed).toBe(true)
  })

  it("blocks mentions when the daily limit is reached", () => {
    expect(checkMentionBudget({ lastUsedAt: undefined, daily: { date: "2026-01-01", count: 100 } }, now).allowed).toBe(
      false,
    )
  })

  it("resets the counter on a new day", () => {
    expect(checkMentionBudget({ lastUsedAt: undefined, daily: { date: "2025-12-31", count: 100 } }, now)).toEqual({
      allowed: true,
      date: "2026-01-01",
      count: 1,
    })
  })

  it("counts the next mention of the day", () => {
    expect(checkMentionBudget({ lastUsedAt: undefined, daily: { date: "2026-01-01", count: 4 } }, now).count).toBe(5)
  })
})
