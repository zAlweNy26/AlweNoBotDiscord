import type { Command } from "./types";

export const commands: Command[] = [];

export const commandMap = new Map<string, Command>();

export function registerCommand(command: Command): void {
  commands.push(command);
  commandMap.set(command.data.name, command);
}
