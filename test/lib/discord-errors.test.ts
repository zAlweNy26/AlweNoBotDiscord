import { DiscordAPIError, PermissionFlagsBits } from "discord.js"
import { describe, expect, it } from "vitest"
import { discordErrorDetail, discordErrorKey, permissionErrorMessage } from "../../src/lib/discord-errors"
import { createTranslator } from "../../src/lib/i18n"

const en = createTranslator("en")
const italian = createTranslator("it")

function apiError(code: number, status: number) {
  return new DiscordAPIError({ message: "boom", code }, code, status, "GET", "https://discord.com/api/v10/x", {
    body: undefined,
    files: undefined,
  })
}

describe("discordErrorKey", () => {
  it("maps permission failures", () => {
    expect(discordErrorKey(apiError(50013, 403))).toBe("forbidden")
    expect(discordErrorKey(apiError(50001, 403))).toBe("forbidden")
  })

  it("maps channel and entity failures", () => {
    expect(discordErrorKey(apiError(50024, 400))).toBe("channelType")
    expect(discordErrorKey(apiError(10003, 404))).toBe("channelGone")
    expect(discordErrorKey(apiError(10004, 404))).toBe("guildGone")
    expect(discordErrorKey(apiError(10007, 404))).toBe("memberGone")
    expect(discordErrorKey(apiError(10011, 404))).toBe("roleGone")
  })

  it("falls back to the permission key for unknown codes with a 403", () => {
    expect(discordErrorKey(apiError(12345, 403))).toBe("forbidden")
  })

  it("returns undefined for unknown codes and other errors", () => {
    expect(discordErrorKey(apiError(12345, 500))).toBeUndefined()
    expect(discordErrorKey(new Error("boom"))).toBeUndefined()
  })
})

describe("discordErrorDetail", () => {
  it("reports the code and status for Discord errors", () => {
    expect(discordErrorDetail(apiError(50013, 403))).toBe(" (code 50013, status 403)")
  })

  it("is empty for other errors", () => {
    expect(discordErrorDetail(new Error("boom"))).toBe("")
  })
})

describe("permissionErrorMessage", () => {
  it("fails open when app_permissions is absent", () => {
    expect(permissionErrorMessage(en, "en", {}, PermissionFlagsBits.ManageMessages)).toBeUndefined()
  })

  it("returns undefined when every flag is granted", () => {
    const appPermissions = PermissionFlagsBits.ReadMessageHistory.toString()
    expect(
      permissionErrorMessage(en, "en", { app_permissions: appPermissions }, PermissionFlagsBits.ReadMessageHistory),
    ).toBeUndefined()
  })

  it("names a single missing permission", () => {
    expect(permissionErrorMessage(en, "en", { app_permissions: "0" }, PermissionFlagsBits.ReadMessageHistory)).toBe(
      "I'm missing the **Read Message History** permission in this channel.",
    )
  })

  it("joins several missing permissions", () => {
    expect(
      permissionErrorMessage(
        en,
        "en",
        { app_permissions: "0" },
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ),
    ).toBe("I'm missing the **Manage Messages** and **Read Message History** permissions in this channel.")
  })

  it("translates to Italian", () => {
    expect(
      permissionErrorMessage(italian, "it", { app_permissions: "0" }, PermissionFlagsBits.ReadMessageHistory),
    ).toBe("Non ho il permesso **Leggi cronologia messaggi** in questo canale.")
  })
})
