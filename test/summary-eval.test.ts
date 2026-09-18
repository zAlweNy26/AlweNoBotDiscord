import { env } from "cloudflare:test"
import { generateText } from "ai"
import { describe, it } from "vitest"
import { createWorkersAI } from "workers-ai-provider"
import { SUMMARY_MODEL, SUMMARY_REQUEST, summarizeWindow, type TranscriptMessage } from "../src/summary"
import { SUMMARY_PROMPTS, type SummaryPrompts } from "../src/summary-prompts"

interface EvalConfig {
  label: string
  model: string
  temperature?: number
  topP?: number
  providerOptions?: NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>
  prompts?: SummaryPrompts
}

const PRODUCTION = { model: SUMMARY_MODEL, ...SUMMARY_REQUEST }

// The candidate models are not reasoning models, so they get production sampling without
// the glm-only reasoning_effort.
const SAMPLING = { temperature: SUMMARY_REQUEST.temperature, topP: SUMMARY_REQUEST.topP }

const CONFIGS: EvalConfig[] = [
  { label: "production", ...PRODUCTION, prompts: SUMMARY_PROMPTS },
  { label: "baseline", model: "@cf/zai-org/glm-4.7-flash" },
  { label: "temp02", model: "@cf/zai-org/glm-4.7-flash", temperature: 0.2 },
  { label: "glm-5.3-flash", model: "@cf/zai-org/glm-5.3-flash", temperature: 0.2 },
  { label: "gemma-4-26b", model: "@cf/google/gemma-4-26b-a4b-it", temperature: 0.2 },
  { label: "gpt-oss-120b", model: "@cf/openai/gpt-oss-120b", temperature: 0.2 },
  {
    label: "mistral-small-24b",
    model: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    ...SAMPLING,
  },
  { label: "llama-4-scout", model: "@cf/meta/llama-4-scout-17b-16e-instruct", ...SAMPLING },
]

const TRAPS_IT = [
  "litigio",
  "matrimonio",
  "promozione",
  "parigi",
  "alluvione",
  "arresto",
  "tradimento",
  "compleanno",
  "addio al celibato",
  "rissa",
]

const TRAPS_EN = [
  "argument",
  "wedding",
  "promotion",
  "paris",
  "flood",
  "arrest",
  "cheating",
  "birthday",
  "bachelor party",
  "brawl",
]

interface AttributionTrap {
  author: string
  context: string
}

// The file exchange in the chaos corpus belongs to Claudia and Ludo only; naming anybody
// else next to it is a swapped subject, even when the quoted line is real.
const ATTRIBUTION_TRAPS_IT: AttributionTrap[] = [
  { author: "Titan", context: "quale file" },
  { author: "Titan", context: "sai quale" },
  { author: "Titan", context: "meglio così" },
  { author: "Fede", context: "amareggiata" },
]

const ATTRIBUTION_TRAPS_EN: AttributionTrap[] = [
  { author: "Titan", context: "which file" },
  { author: "Titan", context: "you know which" },
  { author: "Titan", context: "better this way" },
  { author: "Fede", context: "bitter" },
]

const ENGLISH_MARKERS = [/\bthe\b/i, /\band\b/i, /\bwith\b/i, /\bthey\b/i, /\bwas\b/i]
const ITALIAN_MARKERS = [/\bche\b/i, /\bnon\b/i, /\bper\b/i, /\bcon\b/i, /\buna\b/i]

function detectLanguage(text: string) {
  const english = ENGLISH_MARKERS.filter((marker) => marker.test(text)).length
  const italian = ITALIAN_MARKERS.filter((marker) => marker.test(text)).length
  return english > italian ? "en" : "it"
}

const evalEnv = env as unknown as { SUMMARY_EVAL?: string; SUMMARY_EVAL_CONFIGS?: string }
const enabled = evalEnv.SUMMARY_EVAL === "1"
const requested = (evalEnv.SUMMARY_EVAL_CONFIGS ?? "")
  .split(",")
  .map((label) => label.trim())
  .filter(Boolean)
const selected = requested.length === 0 ? CONFIGS : CONFIGS.filter((c) => requested.includes(c.label))

function makeSummarize(ai: Env["AI"], cfg: EvalConfig) {
  const workersai = createWorkersAI({ binding: ai })
  return async (system: string, user: string) => {
    const text = (
      await generateText({
        model: workersai(cfg.model),
        maxRetries: 2,
        instructions: system,
        messages: [{ role: "user", content: user }],
        ...(cfg.temperature === undefined ? {} : { temperature: cfg.temperature }),
        ...(cfg.topP === undefined ? {} : { topP: cfg.topP }),
        ...(cfg.providerOptions === undefined ? {} : { providerOptions: cfg.providerOptions }),
      })
    ).text.trim()
    if (text.length === 0) {
      throw new Error("empty response")
    }
    return text
  }
}

function countMatches(text: string, needles: string[]) {
  const lower = text.toLowerCase()
  return needles.filter((needle) => lower.includes(needle))
}

function findAttributionTraps(text: string, traps: AttributionTrap[]) {
  const lower = text.toLowerCase()
  const window = 120
  return traps.filter(({ author, context }) => {
    const needle = context.toLowerCase()
    let index = lower.indexOf(needle)
    while (index !== -1) {
      const start = Math.max(0, index - window)
      const end = Math.min(lower.length, index + needle.length + window)
      if (lower.slice(start, end).includes(author.toLowerCase())) {
        return true
      }
      index = lower.indexOf(needle, index + 1)
    }
    return false
  })
}

async function evalCase(
  cfg: EvalConfig,
  caseName: string,
  messages: TranscriptMessage[],
  facts: string[],
  trapWords: string[] = TRAPS_IT,
  language: "it" | "en" = "it",
  attributionTraps: AttributionTrap[] = [],
) {
  const rows: string[] = []
  const outputs: string[] = []
  let successes = 0

  for (let run = 1; run <= 3; run++) {
    const started = Date.now()
    try {
      const summary = await summarizeWindow(makeSummarize((env as unknown as Env).AI, cfg), messages, cfg.prompts)
      const traps = countMatches(summary, trapWords)
      const covered = countMatches(summary, facts)
      const swapped = findAttributionTraps(summary, attributionTraps)
      const detected = detectLanguage(summary)
      const quoted = (summary.match(/["\u00ab\u00bb\u201c\u201d]/g) ?? []).length
      successes += 1
      rows.push(
        `${cfg.label}\trun ${run}\t${Date.now() - started}ms\ttraps=${traps.length === 0 ? "none" : traps.join("|")}\tattrib=${swapped.length === 0 ? "none" : swapped.map(({ author, context }) => `${author}~${context}`).join("|")}\tfacts=${covered.length}/${facts.length}\tlang=${detected}${detected === language ? "" : " DRIFT"}\tquotes=${quoted}\tchars=${summary.length}`,
      )
      outputs.push(`### ${cfg.label} / run ${run}\n${summary}`)
    } catch (error) {
      rows.push(
        `${cfg.label}\trun ${run}\t${Date.now() - started}ms\tERROR ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // This is a manual eval: it always fails so vitest prints the full report.
  throw new Error(
    [
      `EVAL ${cfg.label} / ${caseName} (model=${cfg.model} temperature=${cfg.temperature ?? "default"})`,
      `successes=${successes}/3`,
      ...rows,
      "",
      ...outputs,
    ].join("\n"),
  )
}

function makeMessage(index: number, authorName: string, minute: number, content: string): TranscriptMessage {
  const hours = String(20 + Math.floor(minute / 60)).padStart(2, "0")
  const minutes = String(minute % 60).padStart(2, "0")
  return {
    id: String(100 + index),
    timestamp: `2026-02-15T${hours}:${minutes}:00.000Z`,
    authorId: authorName,
    authorName,
    content,
  }
}

const CHAOS_MESSAGES: TranscriptMessage[] = [
  ["Roby", 0, "oggi giornata pesantissima, ho mangiato due volte"],
  ["Ago", 1, "io sto ancora digiuno da ieri sera, non fate domande"],
  ["Claudia", 2, "la cosa di ieri era assurda, non ne parlo qui"],
  ["Titan", 3, "raga ma la cosa di ieri la scoprono tutti prima o poi"],
  ["Roby", 4, "comunque ho deciso: sabato alle 21:00 si gioca ad Among Us, chi c'è?"],
  ["Fede", 5, "ci sono, ma se killate me per primo vi denuncio"],
  ["Ludo", 6, "io forse, dipende dal turno"],
  ["Dany", 7, "ho creato il modulo, link qui: https://example.com/torneo-sabato — iscrizioni entro mercoledì 18"],
  ["Titan", 8, "l'ennesimo modulo, il tuo capolavoro"],
  ["Ago", 9, "chi ospita il server di Minecraft? perché il mio PC fa un rumore tipo frullatore"],
  ["Claudia", 10, "frullatore a reazione"],
  ["Roby", 11, "rispondete alla domanda di Ago invece di ridere"],
  ["Fede", 12, "non posso, il mio router è in lutto"],
  ["Dany", 13, "comunque il caffè è un food group, lo dico da anni"],
  ["Ago", 14, "colazione: caffè e cornetto. pranzo: caffè. cena: sorprese"],
  ["Titan", 15, "il gatto ha guardato il frigo per tre minuti poi se n'è andato"],
  ["Roby", 16, "relatable"],
  ["Claudia", 17, "sta storia del file però va chiarita, ci sono troppe versioni"],
  ["Ludo", 18, "quale file?"],
  ["Claudia", 19, "sai quale"],
  ["Ludo", 20, "no"],
  ["Claudia", 21, "meglio così"],
  ["Fede", 22, "che bello quando capite tutto tra voi"],
  ["Titan", 23, "proposta: pizza con l'ananas per chi arriva ultimo ad Among Us"],
  ["Ago", 24, "reato penale"],
  ["Roby", 25, "sabato 21 confermato quindi? serve un riepilogo"],
  ["Dany", 26, "confermato, il modulo lo trovate nel mio messaggio. e chi vuole il ruolo da impostore lo dica ora"],
  ["Ludo", 27, "impostore"],
  ["Fede", 28, "ovvio"],
  ["Titan", 29, "io sono sempre impostore inside"],
].map(([author, minute, content], index) => makeMessage(index, String(author), Number(minute), String(content)))

const CHAOS_FACTS = ["among us", "sabato", "21", "mercoled", "torneo-sabato", "minecraft", "modulo"]

const CHAOS_EN_MESSAGES: TranscriptMessage[] = [
  ["Roby", 0, "brutal day today, I ate twice"],
  ["Ago", 1, "I have been fasting since last night, do not ask"],
  ["Claudia", 2, "yesterday's thing was absurd, not talking about it here"],
  ["Titan", 3, "guys everyone finds out about yesterday sooner or later"],
  ["Roby", 4, "alright, decided: saturday at 21:00 we play Among Us, who is in?"],
  ["Fede", 5, "I am in, but if you kill me first I am suing"],
  ["Ludo", 6, "maybe, depends on my shift"],
  ["Dany", 7, "made the form, link here: https://example.com/saturday-tournament - signups close wednesday 18"],
  ["Titan", 8, "another form, your masterpiece"],
  ["Ago", 9, "who is hosting the Minecraft server? my PC sounds like a blender"],
  ["Claudia", 10, "jet powered blender"],
  ["Roby", 11, "answer Ago's question instead of laughing"],
  ["Fede", 12, "cannot, my router is in mourning"],
  ["Dany", 13, "coffee is a food group, I have been saying it for years"],
  ["Ago", 14, "breakfast: coffee and a croissant. lunch: coffee. dinner: surprises"],
  ["Titan", 15, "the cat stared at the fridge for three minutes then walked away"],
  ["Roby", 16, "relatable"],
  ["Claudia", 17, "the file thing needs sorting out though, there are too many versions"],
  ["Ludo", 18, "which file?"],
  ["Claudia", 19, "you know which"],
  ["Ludo", 20, "no"],
  ["Claudia", 21, "better this way"],
  ["Fede", 22, "love it when you two understand each other"],
  ["Titan", 23, "proposal: pineapple pizza for whoever comes last in Among Us"],
  ["Ago", 24, "criminal offence"],
  ["Roby", 25, "saturday 21 confirmed then? we need a recap"],
  ["Dany", 26, "confirmed, the form is in my message. and whoever wants the impostor role say so now"],
  ["Ludo", 27, "impostor"],
  ["Fede", 28, "obviously"],
  ["Titan", 29, "I am always impostor inside"],
].map(([author, minute, content], index) => makeMessage(300 + index, String(author), Number(minute), String(content)))

const CHAOS_EN_FACTS = ["among us", "saturday", "21", "wednesday", "saturday-tournament", "minecraft", "form"]

const FILLER = [
  "Oggi il meteo non aiuta per niente.",
  "Il gatto ha dormito sul monitor tutto il pomeriggio.",
  "Il caffè era troppo caldo e ora è troppo freddo.",
  "Ho perso dieci minuti a cercare le chiavi.",
  "Niente di rilevante da segnalare, tutto tranquillo.",
  "La tastiera fa un rumore strano quando scrivo veloce.",
  "Il pranzo era avanzato da ieri e sapeva di ieri.",
  "Pensiero casuale: le riunioni potrebbero essere email.",
  "Il telefono è al tre per cento e resiste per sport.",
  "Fuori piove e non ho voglia di uscire.",
  "Sto pensando di riordinare la scrivania, forse domani.",
  "Nulla di nuovo sotto il sole.",
]

function fill(content: string, target: number) {
  let text = content
  let index = 0
  while (text.length < target) {
    text += ` ${FILLER[index % FILLER.length]}`
    index += 1
  }
  return text
}

const CHUNKED_FACTS = ["gioved", "host", "venerd", "registro", "budget", "calendario", "sondaggio", "magliett"]

const CHUNKED_FACT_SENTENCES = [
  "Decisione presa: la riunione settimanale si sposta a giovedì 12 alle 19:30.",
  "Richiesta ancora aperta: nessuno si è offerto come host del server di prova.",
  "Scadenza confermata: le iscrizioni chiudono venerdì 13 a mezzanotte.",
  "Link condiviso da tutti: https://example.com/registro",
  "Nota di bilancio: il budget mensile della gilda è stato portato a 40 euro.",
  "Domanda senza risposta: chi aggiorna il calendario condiviso?",
  "Sondaggio chiuso: vince il formato a squadre con 7 voti.",
  "Ordine da fare entro fine mese: le magliette della gilda.",
]

const CHUNKED_AUTHORS = ["Roby", "Claudia", "Ago", "Titan", "Ludo", "Fede", "Dany", "Nova"]

const CHUNKED_MESSAGES: TranscriptMessage[] = CHUNKED_FACT_SENTENCES.map((fact, index) =>
  makeMessage(200 + index, CHUNKED_AUTHORS[index] ?? "Nova", index * 7, fill(fact, 13_000)),
)

describe.skipIf(!enabled)("summary eval", () => {
  for (const cfg of selected) {
    it(`${cfg.label} / chaos-short`, { timeout: 480_000 }, async () => {
      await evalCase(cfg, "chaos-short", CHAOS_MESSAGES, CHAOS_FACTS, TRAPS_IT, "it", ATTRIBUTION_TRAPS_IT)
    })

    it(`${cfg.label} / chaos-short-en`, { timeout: 480_000 }, async () => {
      await evalCase(cfg, "chaos-short-en", CHAOS_EN_MESSAGES, CHAOS_EN_FACTS, TRAPS_EN, "en", ATTRIBUTION_TRAPS_EN)
    })

    it(`${cfg.label} / chunked`, { timeout: 900_000 }, async () => {
      await evalCase(cfg, "chunked", CHUNKED_MESSAGES, CHUNKED_FACTS)
    })
  }
})
