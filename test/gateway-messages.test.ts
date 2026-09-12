import { describe, expect, it } from "vitest";
import { fillMessage } from "../src/gateway/messages";

const member = { id: "123", username: "alwe" };

describe("fillMessage", () => {
  it("replaces the user placeholder with a mention", () => {
    expect(fillMessage("Benvenuto {{utente}}!", member)).toBe("Benvenuto <@123>!");
  });

  it("replaces the username placeholder", () => {
    expect(fillMessage("Ciao {{username}}", member)).toBe("Ciao alwe");
  });

  it("replaces the member count when provided", () => {
    expect(fillMessage("Membri: {{membri}}", member, 42)).toBe("Membri: 42");
  });

  it("leaves the member count placeholder untouched when unknown", () => {
    expect(fillMessage("Membri: {{membri}}", member)).toBe("Membri: {{membri}}");
  });

  it("replaces multiple occurrences", () => {
    expect(fillMessage("{{utente}} {{utente}}", member)).toBe("<@123> <@123>");
  });
});
