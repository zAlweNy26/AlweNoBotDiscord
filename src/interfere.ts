import { deliverReply, hasWords, type MentionDeps, type MentionMessage } from "./mention"
import { interfereReminder, localTime, pickRegister, REPLY_PERSONA } from "./reply-prompts"

export const INTERFERE_LIMIT = 400
export const INTERFERE_CONTEXT_LINES = 8

const IGNORE_MARKER = /^\s*\{\{ignore\}\}\s*$/i

export function isIgnoreMarker(reply: string) {
  return IGNORE_MARKER.test(reply)
}

export function appendLine(transcript: string[], line: string) {
  return [...transcript, line].slice(-INTERFERE_CONTEXT_LINES)
}

export async function replyToInterfere(deps: MentionDeps, message: MentionMessage, transcript: string[]) {
  if (!hasWords(message.content)) {
    return false
  }
  const request = `${transcript.join("\n")}\n${interfereReminder(pickRegister(), localTime(message.timestamp))}`
  const reply = await deps.summarize(REPLY_PERSONA, request)
  if (isIgnoreMarker(reply)) {
    return false
  }
  return deliverReply(deps, message, reply, INTERFERE_LIMIT)
}
