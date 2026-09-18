import type { APIApplicationCommand } from "discord.js"

interface LocalizableOption {
  name: string
  description_localizations?: APIApplicationCommand["description_localizations"] | null
  options?: LocalizableOption[]
}

function localizeOption(option: LocalizableOption, path: string, descriptions: Record<string, string>) {
  const description = descriptions[path]
  if (description) {
    option.description_localizations = { it: description }
  }
  for (const child of option.options ?? []) {
    localizeOption(child, `${path}.${child.name}`, descriptions)
  }
}

export function applyCommandLocalizations<T extends LocalizableOption>(
  commands: T[],
  descriptions: Record<string, string>,
) {
  for (const command of commands) {
    localizeOption(command, command.name, descriptions)
  }
}
