import { describe, expect, it } from "vitest"
import { createTranslator } from "../../src/lib/i18n"
import { weatherCodeKey } from "../../src/lib/weather"

const en = createTranslator("en")
const italian = createTranslator("it")

describe("weatherCodeKey", () => {
  it("maps known WMO codes to keys", () => {
    expect(weatherCodeKey(0)).toBe("code0")
    expect(weatherCodeKey(3)).toBe("code3")
    expect(weatherCodeKey(95)).toBe("code95")
  })

  it("falls back to the unknown key", () => {
    expect(weatherCodeKey(1234)).toBe("unknown")
  })
})

describe("weather descriptions", () => {
  it("translates WMO codes to English", () => {
    expect(en(($) => $.weather[weatherCodeKey(0)])).toBe("Clear sky")
    expect(en(($) => $.weather[weatherCodeKey(3)])).toBe("Overcast")
    expect(en(($) => $.weather[weatherCodeKey(95)])).toBe("Thunderstorm")
    expect(en(($) => $.weather[weatherCodeKey(1234)])).toBe("Unknown conditions")
  })

  it("translates WMO codes to Italian", () => {
    expect(italian(($) => $.weather[weatherCodeKey(0)])).toBe("Cielo sereno")
    expect(italian(($) => $.weather[weatherCodeKey(3)])).toBe("Cielo coperto")
    expect(italian(($) => $.weather[weatherCodeKey(95)])).toBe("Temporale")
    expect(italian(($) => $.weather[weatherCodeKey(1234)])).toBe("Condizioni sconosciute")
  })
})
