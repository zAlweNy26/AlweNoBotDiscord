import { describe, expect, it } from "vitest"
import { formatDate, formatIsoTimestamp, formatUnixTimestamp } from "../../src/lib/format"

describe("date formatting", () => {
  it("formats Unix seconds in English", () => {
    expect(formatUnixTimestamp(1579083630, "en")).toBe("January 15, 2020 at 10:20:30 AM")
  })

  it("formats ISO timestamps in English", () => {
    expect(formatIsoTimestamp("2020-01-15T10:20:30Z", "en")).toBe("January 15, 2020 at 10:20:30 AM")
  })

  it("formats in Italian", () => {
    expect(formatIsoTimestamp("2020-01-15T10:20:30Z", "it")).toBe("15 gennaio 2020 alle ore 10:20:30")
  })

  it("can omit the time", () => {
    expect(formatDate(new Date("2020-01-15T10:20:30Z"), false, "en")).toBe("January 15, 2020")
  })
})
