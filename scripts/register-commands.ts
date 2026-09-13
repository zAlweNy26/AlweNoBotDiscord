import { readFileSync } from "node:fs";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { commands } from "../src/commands";

function loadDevVars(): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(".dev.vars", "utf8");
  } catch {
    return {};
  }

  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) {
      continue;
    }
    const key = match[1];
    const value = match[2]?.replace(/^["']|["']$/g, "") ?? "";
    if (key && value) {
      vars[key] = value;
    }
  }
  return vars;
}

const vars: Record<string, string | undefined> = { ...loadDevVars(), ...process.env };
const token = vars.DISCORD_TOKEN;
const applicationId = vars.DISCORD_APPLICATION_ID;

if (!token || !applicationId) {
  console.error("Imposta DISCORD_TOKEN e DISCORD_APPLICATION_ID in .dev.vars");
  process.exit(1);
}

const body = commands.map((command) => command.data.toJSON());

await new REST({ version: "10" })
  .setToken(token)
  .put(Routes.applicationCommands(applicationId), { body });
console.log(`Registrati ${body.length} comandi globali.`);
