import { describe, expect, it } from "vitest"
import { parseSteamInput, steamId64FromAccountId } from "../../src/lib/steam"

describe("steamId64FromAccountId", () => {
  it("converts a 32-bit account id", () => {
    expect(steamId64FromAccountId(12345n)).toBe("76561197960278073")
  })
})

describe("parseSteamInput", () => {
  it("accepts a 17-digit SteamID64", () => {
    expect(parseSteamInput("76561198000000000")).toEqual({ kind: "id64", id: "76561198000000000" })
  })

  it("extracts ids from profile URLs", () => {
    expect(parseSteamInput("https://steamcommunity.com/profiles/76561198000000000/")).toEqual({
      kind: "id64",
      id: "76561198000000000",
    })
  })

  it("extracts vanity names from id URLs", () => {
    expect(parseSteamInput("https://steamcommunity.com/id/gaben")).toEqual({
      kind: "vanity",
      name: "gaben",
    })
  })

  it("converts legacy STEAM_x:y:z ids", () => {
    expect(parseSteamInput("STEAM_0:1:12345")).toEqual({ kind: "id64", id: "76561197960290419" })
  })

  it("converts bracket ids", () => {
    expect(parseSteamInput("[U:1:12345]")).toEqual({ kind: "id64", id: "76561197960278073" })
  })

  it("treats a plain string as a vanity name", () => {
    expect(parseSteamInput("gabe")).toEqual({ kind: "vanity", name: "gabe" })
  })

  it("rejects empty input", () => {
    expect(parseSteamInput("   ")).toBeNull()
  })
})
