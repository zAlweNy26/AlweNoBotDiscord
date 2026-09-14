export interface ActivityMessage {
  authorId: string
  content: string
}

export interface ActivityEntry {
  authorId: string
  messages: number
  characters: number
  share: number
}

export interface ActivityReport {
  total: number
  participants: number
  top: ActivityEntry[]
}

export function rankActivity(messages: ActivityMessage[], limit: number): ActivityReport {
  const totals = new Map<string, { messages: number; characters: number }>()

  for (const message of messages) {
    const current = totals.get(message.authorId) ?? { messages: 0, characters: 0 }
    current.messages += 1
    current.characters += message.content.trim().length
    totals.set(message.authorId, current)
  }

  const ranked = [...totals]
    .map(([authorId, counts]) => ({
      authorId,
      messages: counts.messages,
      characters: counts.characters,
      share: (counts.messages / messages.length) * 100,
    }))
    .sort((a, b) => b.messages - a.messages || b.characters - a.characters || (a.authorId < b.authorId ? -1 : 1))

  return {
    total: messages.length,
    participants: totals.size,
    top: ranked.slice(0, Math.max(limit, 0)),
  }
}
