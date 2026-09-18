import { describe, expect, it } from "vitest"
import type { DiscordErrorKey, PermissionLabelKey } from "../../src/lib/discord-errors"
import { createTranslator, normalizeLocale } from "../../src/lib/i18n"

describe("normalizeLocale", () => {
  it("falls back to english for missing or unsupported locales", () => {
    expect(normalizeLocale(undefined)).toBe("en")
    expect(normalizeLocale("fr")).toBe("en")
    expect(normalizeLocale("")).toBe("en")
  })

  it("reduces regional variants to their primary subtag", () => {
    expect(normalizeLocale("it-IT")).toBe("it")
    expect(normalizeLocale("en-GB")).toBe("en")
    expect(normalizeLocale("EN")).toBe("en")
  })
})

describe("createTranslator", () => {
  it("translates in english by default", () => {
    const t = createTranslator(undefined)
    expect(t(($) => $.common.commandError)).toBe("Something went wrong while running this command.")
  })

  it("translates in italian", () => {
    const t = createTranslator("it-IT")
    expect(t(($) => $.common.commandError)).toBe("Si è verificato un errore durante l'esecuzione del comando.")
  })

  it("interpolates plural forms", () => {
    const t = createTranslator("en")
    expect(t(($) => $.permissions.missing, { count: 1, permissions: "**Manage Roles**" })).toBe(
      "I'm missing the **Manage Roles** permission in this channel.",
    )
    expect(t(($) => $.permissions.missing, { count: 2, permissions: "**A** and **B**" })).toBe(
      "I'm missing the **A** and **B** permissions in this channel.",
    )
  })

  it("keeps locales apart across instances", () => {
    const en = createTranslator("en")
    const it = createTranslator("it")
    expect(en(($) => $.common.commandError)).not.toBe(it(($) => $.common.commandError))
  })

  it("resolves dynamic keys", () => {
    const t = createTranslator("en")
    const label: PermissionLabelKey = "manageMessages"
    expect(t(($) => $.permissions.labels[label])).toBe("Manage Messages")
    const error: DiscordErrorKey = "forbidden"
    expect(t(($) => $.errors[error])).toBe("I don't have the permissions to do that.")
    expect(t(($) => $.weather.code95)).toBe("Thunderstorm")
  })
})
