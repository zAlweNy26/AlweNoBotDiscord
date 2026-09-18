import { readFileSync } from "node:fs"
import { REST, Routes } from "discord.js"
import { commands } from "../src/commands"
import { applyCommandLocalizations } from "../src/lib/localize-commands"
import { commandDescriptionLocalizations } from "../src/locales/descriptions.it"

function loadDevVars() {
  let content: string
  try {
    content = readFileSync(".dev.vars", "utf8")
  } catch {
    return {}
  }

  const vars: Record<string, string> = {}
  for (const line of content.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match) {
      continue
    }
    const key = match[1]
    const value = match[2]?.replace(/^["']|["']$/g, "") ?? ""
    if (key && value) {
      vars[key] = value
    }
  }
  return vars
}

const vars: Record<string, string | undefined> = { ...loadDevVars(), ...process.env }
const token = vars.DISCORD_TOKEN
const applicationId = vars.DISCORD_APPLICATION_ID
const guildId = vars.DISCORD_GUILD_ID

if (!token || !applicationId) {
  console.error("Set DISCORD_TOKEN and DISCORD_APPLICATION_ID in .dev.vars")
  process.exit(1)
}

const body = commands.map((command) => command.data.toJSON())
applyCommandLocalizations(body, commandDescriptionLocalizations)

const rest = new REST({ version: "10" }).setToken(token)
if (guildId) {
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body })
  console.log(`Registered ${body.length} commands in guild ${guildId}.`)
} else {
  await rest.put(Routes.applicationCommands(applicationId), { body })
  console.log(`Registered ${body.length} global commands.`)
}
