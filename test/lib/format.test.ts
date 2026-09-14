import { describe, expect, it } from "vitest"
import { formatDate, formatIsoTimestamp, formatUnixTimestamp } from "../../src/lib/format"

describe("date formatting", () => {
  it("formats Unix seconds in Italian", () => {
    expect(formatUnixTimestamp(1579083630)).toBe("15 Gennaio 2020 alle 10:20:30")
  })

  it("formats ISO timestamps in Italian", () => {
    expect(formatIsoTimestamp("2020-01-15T10:20:30Z")).toBe("15 Gennaio 2020 alle 10:20:30")
  })

  it("can omit the time", () => {
    expect(formatDate(new Date("2020-01-15T10:20:30Z"), false)).toBe("15 Gennaio 2020")
  })
})
