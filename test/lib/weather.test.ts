import { describe, expect, it } from "vitest"
import { describeWeatherCode } from "../../src/lib/weather"

describe("describeWeatherCode", () => {
  it("translates WMO codes to Italian", () => {
    expect(describeWeatherCode(0)).toBe("Cielo sereno")
    expect(describeWeatherCode(3)).toBe("Cielo coperto")
    expect(describeWeatherCode(95)).toBe("Temporale")
  })

  it("handles unknown codes", () => {
    expect(describeWeatherCode(1234)).toBe("Condizioni sconosciute")
  })
})
