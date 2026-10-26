import { PermissionFlagsBits } from "discord.js"
import { describe, expect, it } from "vitest"
import { canGrant } from "../src/commands/reactionrole"

const MANAGE = PermissionFlagsBits.ManageRoles | PermissionFlagsBits.SendMessages

describe("canGrant", () => {
  it("allows a role whose permissions the moderator already has", () => {
    expect(canGrant(String(PermissionFlagsBits.SendMessages), String(MANAGE))).toBe(true)
  })

  it("refuses a role that grants more than the moderator has", () => {
    expect(canGrant(String(PermissionFlagsBits.Administrator), String(MANAGE))).toBe(false)
    expect(canGrant(String(PermissionFlagsBits.BanMembers), String(MANAGE))).toBe(false)
  })

  it("lets administrators grant anything", () => {
    expect(canGrant(String(PermissionFlagsBits.BanMembers), String(PermissionFlagsBits.Administrator))).toBe(true)
  })

  it("refuses when either side is unknown", () => {
    expect(canGrant(undefined, String(MANAGE))).toBe(false)
    expect(canGrant("0", undefined)).toBe(false)
  })
})
