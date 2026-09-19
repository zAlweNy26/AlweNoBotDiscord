import { describe, expect, it } from "vitest"
import { commandMap, commands } from "../src/commands/index"
import { commandDescriptionLocalizations } from "../src/locales/descriptions.it"

const EXPECTED_COMMANDS = [
  "activity",
  "clear",
  "color",
  "counter",
  "crypto",
  "distance",
  "farewell",
  "help",
  "info",
  "interfere",
  "language",
  "mention",
  "ping",
  "reactionrole",
  "server",
  "stats",
  "steam",
  "steamgame",
  "summary",
  "weather",
  "welcome",
  "ytinfo",
]

interface CommandJson {
  name: string
  options?: CommandJson[]
}

function collectPaths(node: CommandJson, path: string, paths: Set<string>) {
  paths.add(path)
  for (const child of node.options ?? []) {
    collectPaths(child, `${path}.${child.name}`, paths)
  }
}

describe("command registry", () => {
  it("registers every expected command exactly once", () => {
    const names = commands.map((command) => command.data.name)
    expect([...names].sort()).toEqual(EXPECTED_COMMANDS)
    expect(new Set(names).size).toBe(names.length)
  })

  it("routes every registered command through the map", () => {
    for (const command of commands) {
      expect(commandMap.get(command.data.name)).toBe(command)
    }
  })
})

describe("italian command descriptions", () => {
  it("has no path that no longer exists", () => {
    const paths = new Set<string>()
    for (const command of commands) {
      collectPaths(command.data.toJSON(), command.data.name, paths)
    }
    const stale = Object.keys(commandDescriptionLocalizations).filter((path) => !paths.has(path))
    expect(stale).toEqual([])
  })
})
