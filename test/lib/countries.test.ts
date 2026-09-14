import { describe, expect, it } from "vitest"
import { getCountryName } from "../../src/lib/countries"

describe("getCountryName", () => {
  it("returns the Italian name for a known code", () => {
    expect(getCountryName("IT")).toBe("Italia")
    expect(getCountryName("US")).toBe("Stati Uniti d'America")
  })

  it("is case-insensitive", () => {
    expect(getCountryName("it")).toBe("Italia")
  })

  it("returns the input for an unknown code", () => {
    expect(getCountryName("XX")).toBe("XX")
  })
})
