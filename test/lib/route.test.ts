import { describe, expect, it } from "vitest"
import { createTranslator } from "../../src/lib/i18n"
import { formatRouteDistance, formatRouteDuration } from "../../src/lib/route"

const en = createTranslator("en")
const italian = createTranslator("it")

describe("formatRouteDistance", () => {
  it("keeps metres below a kilometre", () => {
    expect(formatRouteDistance(0)).toBe("0 m")
    expect(formatRouteDistance(940.6)).toBe("941 m")
    expect(formatRouteDistance(999)).toBe("999 m")
  })

  it("switches to kilometres with one decimal", () => {
    expect(formatRouteDistance(1000)).toBe("1.0 km")
    expect(formatRouteDistance(1168.1)).toBe("1.2 km")
    expect(formatRouteDistance(572532.5)).toBe("572.5 km")
  })
})

describe("formatRouteDuration", () => {
  it("names durations shorter than a minute", () => {
    expect(formatRouteDuration(0, en)).toBe("less than a minute")
    expect(formatRouteDuration(29, italian)).toBe("meno di un minuto")
  })

  it("rounds to whole minutes below an hour", () => {
    expect(formatRouteDuration(30, en)).toBe("1 min")
    expect(formatRouteDuration(304.1, en)).toBe("5 min")
    expect(formatRouteDuration(3540, en)).toBe("59 min")
  })

  it("splits hours from minutes", () => {
    expect(formatRouteDuration(3600, en)).toBe("1 h")
    expect(formatRouteDuration(7260, en)).toBe("2 h 1 min")
    expect(formatRouteDuration(21554.2, en)).toBe("5 h 59 min")
  })
})
