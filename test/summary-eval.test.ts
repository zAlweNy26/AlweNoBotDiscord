import { env } from "cloudflare:test";
import { generateText } from "ai";
import { describe, it } from "vitest";
import { createWorkersAI } from "workers-ai-provider";
import { summarizeWindow, type TranscriptMessage } from "../src/summary";

interface EvalConfig {
  label: string;
  model: string;
  temperature?: number;
  providerOptions?: NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>;
}

const CONFIGS: EvalConfig[] = [
  { label: "baseline", model: "@cf/zai-org/glm-4.7-flash" },
  { label: "temp02", model: "@cf/zai-org/glm-4.7-flash", temperature: 0.2 },
  { label: "glm-5.3-flash", model: "@cf/zai-org/glm-5.3-flash", temperature: 0.2 },
  { label: "gemma-4-26b", model: "@cf/google/gemma-4-26b-a4b-it", temperature: 0.2 },
  { label: "gpt-oss-120b", model: "@cf/openai/gpt-oss-120b", temperature: 0.2 },
];

const TRAPS = [
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
];

const evalEnv = env as unknown as { SUMMARY_EVAL?: string; SUMMARY_EVAL_CONFIGS?: string };
const enabled = evalEnv.SUMMARY_EVAL === "1";
const requested = (evalEnv.SUMMARY_EVAL_CONFIGS ?? "")
  .split(",")
  .map((label) => label.trim())
  .filter(Boolean);
const selected =
  requested.length === 0 ? CONFIGS : CONFIGS.filter((c) => requested.includes(c.label));

function makeSummarize(
  ai: Env["AI"],
  model: string,
  temperature?: number,
  providerOptions?: EvalConfig["providerOptions"],
) {
  const workersai = createWorkersAI({ binding: ai });
  return async (system: string, user: string) => {
    const text = (
      await generateText({
        model: workersai(model),
        maxRetries: 2,
        instructions: system,
        messages: [{ role: "user", content: user }],
        ...(temperature === undefined ? {} : { temperature }),
        ...(providerOptions === undefined ? {} : { providerOptions }),
      })
    ).text.trim();
    if (text.length === 0) {
      throw new Error("empty response");
    }
    return text;
  };
}

function countMatches(text: string, needles: string[]) {
  const lower = text.toLowerCase();
  return needles.filter((needle) => lower.includes(needle));
}

async function evalCase(
  cfg: EvalConfig,
  caseName: string,
  messages: TranscriptMessage[],
  facts: string[],
) {
  const rows: string[] = [];
  const outputs: string[] = [];
  let successes = 0;

  for (let run = 1; run <= 3; run++) {
    const started = Date.now();
    try {
      const summary = await summarizeWindow(
        makeSummarize((env as unknown as Env).AI, cfg.model, cfg.temperature, cfg.providerOptions),
        messages,
      );
      const traps = countMatches(summary, TRAPS);
      const covered = countMatches(summary, facts);
      successes += 1;
      rows.push(
        `${cfg.label}\trun ${run}\t${Date.now() - started}ms\ttraps=${traps.length === 0 ? "none" : traps.join("|")}\tfacts=${covered.length}/${facts.length}\tchars=${summary.length}`,
      );
      outputs.push(`### ${cfg.label} / run ${run}\n${summary}`);
    } catch (error) {
      rows.push(
        `${cfg.label}\trun ${run}\t${Date.now() - started}ms\tERROR ${error instanceof Error ? error.message : String(error)}`,
      );
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
  );
}

function makeMessage(
  index: number,
  authorName: string,
  minute: number,
  content: string,
): TranscriptMessage {
  const hours = String(20 + Math.floor(minute / 60)).padStart(2, "0");
  const minutes = String(minute % 60).padStart(2, "0");
  return {
    id: String(100 + index),
    timestamp: `2026-02-15T${hours}:${minutes}:00.000Z`,
    authorName,
    content,
  };
}

const CHAOS_MESSAGES: TranscriptMessage[] = [
  ["Roby", 0, "oggi giornata pesantissima, ho mangiato due volte"],
  ["Ago", 1, "io sto ancora digiuno da ieri sera, non fate domande"],
  ["Claudia", 2, "la cosa di ieri era assurda, non ne parlo qui"],
  ["Titan", 3, "raga ma la cosa di ieri la scoprono tutti prima o poi"],
  ["Roby", 4, "comunque ho deciso: sabato alle 21:00 si gioca ad Among Us, chi c'è?"],
  ["Fede", 5, "ci sono, ma se killate me per primo vi denuncio"],
  ["Ludo", 6, "io forse, dipende dal turno"],
  [
    "Dany",
    7,
    "ho creato il modulo, link qui: https://example.com/torneo-sabato — iscrizioni entro mercoledì 18",
  ],
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
  [
    "Dany",
    26,
    "confermato, il modulo lo trovate nel mio messaggio. e chi vuole il ruolo da impostore lo dica ora",
  ],
  ["Ludo", 27, "impostore"],
  ["Fede", 28, "ovvio"],
  ["Titan", 29, "io sono sempre impostore inside"],
].map(([author, minute, content], index) =>
  makeMessage(index, String(author), Number(minute), String(content)),
);

const CHAOS_FACTS = [
  "among us",
  "sabato",
  "21",
  "mercoled",
  "torneo-sabato",
  "minecraft",
  "modulo",
];

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
];

function fill(content: string, target: number) {
  let text = content;
  let index = 0;
  while (text.length < target) {
    text += ` ${FILLER[index % FILLER.length]}`;
    index += 1;
  }
  return text;
}

const CHUNKED_FACTS = [
  "gioved",
  "host",
  "venerd",
  "registro",
  "budget",
  "calendario",
  "sondaggio",
  "magliett",
];

const CHUNKED_FACT_SENTENCES = [
  "Decisione presa: la riunione settimanale si sposta a giovedì 12 alle 19:30.",
  "Richiesta ancora aperta: nessuno si è offerto come host del server di prova.",
  "Scadenza confermata: le iscrizioni chiudono venerdì 13 a mezzanotte.",
  "Link condiviso da tutti: https://example.com/registro",
  "Nota di bilancio: il budget mensile della gilda è stato portato a 40 euro.",
  "Domanda senza risposta: chi aggiorna il calendario condiviso?",
  "Sondaggio chiuso: vince il formato a squadre con 7 voti.",
  "Ordine da fare entro fine mese: le magliette della gilda.",
];

const CHUNKED_AUTHORS = ["Roby", "Claudia", "Ago", "Titan", "Ludo", "Fede", "Dany", "Nova"];

const CHUNKED_MESSAGES: TranscriptMessage[] = CHUNKED_FACT_SENTENCES.map((fact, index) =>
  makeMessage(200 + index, CHUNKED_AUTHORS[index] ?? "Nova", index * 7, fill(fact, 13_000)),
);

describe.skipIf(!enabled)("summary eval", () => {
  for (const cfg of selected) {
    it(`${cfg.label} / chaos-short`, { timeout: 480_000 }, async () => {
      await evalCase(cfg, "chaos-short", CHAOS_MESSAGES, CHAOS_FACTS);
    });

    it(`${cfg.label} / chunked`, { timeout: 900_000 }, async () => {
      await evalCase(cfg, "chunked", CHUNKED_MESSAGES, CHUNKED_FACTS);
    });
  }
});
