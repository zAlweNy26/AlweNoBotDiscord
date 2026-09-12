import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  addRoleButton,
  deleteRoleButton,
  deleteRoleButtonsForMessage,
  ensureGuildSettings,
  getGuildSettings,
  getRoleButton,
  listRoleButtons,
  updateGuildSettings,
} from "../src/db";

const GUILD_ID = "111111111111111111";

describe("guild settings", () => {
  it("returns null for an unknown guild", async () => {
    expect(await getGuildSettings(env.DB, GUILD_ID)).toBeNull();
  });

  it("creates default settings on ensure", async () => {
    const settings = await ensureGuildSettings(env.DB, GUILD_ID);
    expect(settings.guildId).toBe(GUILD_ID);
    expect(settings.welcomeEnabled).toBe(false);
    expect(settings.welcomeChannelId).toBeNull();
    expect(settings.counterFormat).toBeNull();
  });

  it("patches only the provided fields", async () => {
    await ensureGuildSettings(env.DB, GUILD_ID);
    await updateGuildSettings(env.DB, GUILD_ID, {
      welcomeEnabled: true,
      welcomeChannelId: "222222222222222222",
      welcomeMessage: "Benvenuto {{utente}}!",
    });
    const settings = await getGuildSettings(env.DB, GUILD_ID);
    expect(settings?.welcomeEnabled).toBe(true);
    expect(settings?.welcomeChannelId).toBe("222222222222222222");
    expect(settings?.welcomeMessage).toBe("Benvenuto {{utente}}!");
    expect(settings?.farewellEnabled).toBe(false);
  });

  it("can clear a nullable field back to null", async () => {
    await ensureGuildSettings(env.DB, GUILD_ID);
    await updateGuildSettings(env.DB, GUILD_ID, { counterChannelId: "333333333333333333" });
    await updateGuildSettings(env.DB, GUILD_ID, { counterChannelId: null });
    expect((await getGuildSettings(env.DB, GUILD_ID))?.counterChannelId).toBeNull();
  });
});

describe("role buttons", () => {
  const MESSAGE_ID = "444444444444444444";
  const ROLE_ID = "555555555555555555";

  it("adds and reads a button", async () => {
    await addRoleButton(env.DB, {
      messageId: MESSAGE_ID,
      roleId: ROLE_ID,
      guildId: GUILD_ID,
      label: "Notifiche",
      emoji: "🔔",
    });
    const button = await getRoleButton(env.DB, MESSAGE_ID, ROLE_ID);
    expect(button).toEqual({
      messageId: MESSAGE_ID,
      roleId: ROLE_ID,
      guildId: GUILD_ID,
      label: "Notifiche",
      emoji: "🔔",
    });
  });

  it("updates label and emoji on conflict", async () => {
    await addRoleButton(env.DB, {
      messageId: MESSAGE_ID,
      roleId: ROLE_ID,
      guildId: GUILD_ID,
      label: "Notifiche push",
      emoji: null,
    });
    const button = await getRoleButton(env.DB, MESSAGE_ID, ROLE_ID);
    expect(button?.label).toBe("Notifiche push");
    expect(button?.emoji).toBeNull();
  });

  it("lists buttons for a guild and deletes them", async () => {
    await addRoleButton(env.DB, {
      messageId: MESSAGE_ID,
      roleId: "666666666666666666",
      guildId: GUILD_ID,
      label: "Annunci",
      emoji: null,
    });
    expect((await listRoleButtons(env.DB, GUILD_ID)).length).toBeGreaterThanOrEqual(2);
    await deleteRoleButton(env.DB, MESSAGE_ID, ROLE_ID);
    expect(await getRoleButton(env.DB, MESSAGE_ID, ROLE_ID)).toBeNull();
    await deleteRoleButtonsForMessage(env.DB, MESSAGE_ID);
    expect(await listRoleButtons(env.DB, GUILD_ID)).toEqual([]);
  });
});
