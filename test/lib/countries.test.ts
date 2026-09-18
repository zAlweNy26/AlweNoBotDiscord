import { describe, expect, it } from "vitest"
import { getCountryName } from "../../src/lib/countries"

describe("getCountryName", () => {
  it("returns the English name for a known code", () => {
    expect(getCountryName("IT", "en")).toBe("Italy")
    expect(getCountryName("US", "en")).toBe("United States")
  })

  it("returns the localized name", () => {
    expect(getCountryName("IT", "it")).toBe("Italia")
  })

  it("is case-insensitive", () => {
    expect(getCountryName("it", "en")).toBe("Italy")
  })

  it("returns the input for an unknown code", () => {
    expect(getCountryName("XX", "en")).toBe("XX")
  })
})
