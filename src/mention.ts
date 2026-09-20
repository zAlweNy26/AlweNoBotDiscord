import { type APIAttachment, type APIUser, type GatewayMessageCreateDispatchData, type REST, Routes } from "discord.js"
import { localTime, mentionReminder, pickRegister, REPLY_PERSONA } from "./reply-prompts"
import { clampSummary } from "./summary"

const MENTION_LIMIT = 800
const USER_MENTION = /<@!?(\d+)>/g
const LINK = /https?:\/\/\S+/g
const GIF_HOSTS = ["tenor.com", "giphy.com"]
const GIF_MARKER = /\{\{gif:\s*([^{}]+?)\s*\}\}/i
const DISCORD_TOKEN = /<[^>]*>/g
const LETTER = /\p{L}/u

export function gifQuery(text: string) {
  const match = GIF_MARKER.exec(text)
  return match?.[1]?.trim() || null
}

export function hasWords(content: string) {
  return LETTER.test(content.replace(DISCORD_TOKEN, ""))
}

export interface MentionDeps {
  rest: REST
  summarize: (system: string, user: string) => Promise<string>
  searchGif: (query: string) => Promise<string | null>
}

export type MentionMessage = GatewayMessageCreateDispatchData

export function isMentionTrigger(message: MentionMessage, botId: string) {
  return !message.author.bot && !message.webhook_id && message.mentions.some((user) => user.id === botId)
}

function displayName(author: APIUser, nick?: string | null) {
  return nick ?? author.global_name ?? author.username
}

// Tenor and Giphy links carry a slug that reads as a caption of a gif nobody here can watch.
function gifWords(rawUrl: string) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return undefined
  }
  if (!GIF_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    return undefined
  }
  const slug = url.pathname.split("/").filter(Boolean).pop()
  if (!slug || /\.\w+$/.test(slug)) {
    return "[gif]"
  }
  const words = slug.split("-")
  while (words.length > 0) {
    const last = words[words.length - 1]
    if (last === undefined || !(last === "gif" || /^\d+$/.test(last) || (last.length >= 7 && /\d/.test(last)))) {
      break
    }
    words.pop()
  }
  return words.length === 0 ? "[gif]" : `[gif: ${words.join(" ")}]`
}

function renderContent(content: string, names: Map<string, string>, botId: string) {
  return content
    .replace(USER_MENTION, (match: string, id: string) => (id === botId ? "" : (names.get(id) ?? match)))
    .replace(LINK, (url: string) => gifWords(url) ?? url)
    .replace(/[ \t]+/g, " ")
    .trim()
}

function attachmentMarker(attachment: APIAttachment) {
  const type = attachment.content_type ?? ""
  if (type.startsWith("image/gif") || attachment.filename.toLowerCase().endsWith(".gif")) {
    return "[gif]"
  }
  if (type.startsWith("image/")) {
    return "[immagine]"
  }
  if (type.startsWith("video/")) {
    return "[video]"
  }
  if (type.startsWith("audio/")) {
    return "[audio]"
  }
  return "[file]"
}

function describeAttachments(message: Pick<MentionMessage, "attachments" | "sticker_items">) {
  return [
    ...message.attachments.map(attachmentMarker),
    ...(message.sticker_items ?? []).map((sticker) => `[sticker: ${sticker.name}]`),
  ]
}

function transcriptLine(name: string, content: string) {
  return `${name}: ${content}`.trimEnd()
}

type LineSource = Pick<MentionMessage, "author" | "content" | "attachments" | "sticker_items">

function namesFor(message: MentionMessage) {
  return new Map(message.mentions.map((user): [string, string] => [user.id, displayName(user, user.member?.nick)]))
}

function lineFor(source: LineSource, names: Map<string, string>, botId: string, nick?: string | null) {
  return transcriptLine(
    displayName(source.author, nick),
    [renderContent(source.content, names, botId), ...describeAttachments(source)].filter(Boolean).join(" "),
  )
}

export function messageLine(message: MentionMessage, botId: string) {
  return lineFor(message, namesFor(message), botId, message.member?.nick)
}

export function buildMentionRequest(message: MentionMessage, botId: string) {
  const names = namesFor(message)
  const lines: string[] = []
  const referenced = message.referenced_message
  if (referenced) {
    lines.push(lineFor(referenced, names, botId))
  }
  lines.push(lineFor(message, names, botId, message.member?.nick))
  return lines.join("\n")
}

export async function deliverReply(deps: MentionDeps, message: MentionMessage, reply: string, limit: number) {
  const query = gifQuery(reply)
  let content: string
  if (query) {
    let url: string | null
    try {
      url = await deps.searchGif(query)
    } catch (error) {
      console.error(`Failed to search a gif for "${query}"`, error)
      return false
    }
    if (!url) {
      console.error(`No gif found for "${query}"`)
      return false
    }
    content = url
  } else {
    content = clampSummary(reply, limit)
  }
  await deps.rest.post(Routes.channelMessages(message.channel_id), {
    body: {
      content,
      message_reference: { message_id: message.id },
      allowed_mentions: { parse: [], replied_user: true },
    },
  })
  return true
}

export async function replyToMention(deps: MentionDeps, message: MentionMessage, botId: string) {
  if (!hasWords(message.content)) {
    return false
  }
  const request = `${buildMentionRequest(message, botId)}\n${mentionReminder(pickRegister(), localTime(message.timestamp))}`
  const reply = await deps.summarize(REPLY_PERSONA, request)
  return deliverReply(deps, message, reply, MENTION_LIMIT)
}
