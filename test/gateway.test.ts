import { describe, expect, it } from "vitest"
import { toHttpUrl } from "../src/gateway/GatewayDO"

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
