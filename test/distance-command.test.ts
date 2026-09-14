import {
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
  ApplicationCommandOptionType,
  type REST,
} from "discord.js"
import { afterEach, describe, expect, it, vi } from "vitest"
import { distanceCommand } from "../src/commands/distance"

const MILANO = { name: "Milano", latitude: 45.46427, longitude: 9.18951, admin1: "Lombardia", country: "Italia" }
const ROMA = { name: "Roma", latitude: 41.9028, longitude: 12.4964, admin1: "Lazio", country: "Italia" }

interface Responses {
  geocoding?: (place: string) => unknown
  routing?: unknown
}

function stubFetch(responses: Responses) {
  const calls: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    const body = url.includes("geocoding-api")
      ? { results: [responses.geocoding?.(new URL(url).searchParams.get("name") ?? "")].filter(Boolean) }
      : responses.routing
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return calls
}

function createInteraction(options: { name: string; value: string }[]) {
  return {
    guild_id: "guild",
    channel_id: "canale",
    token: "token",
    data: {
      name: "distance",
      options: options.map((option) => ({ ...option, type: ApplicationCommandOptionType.String })),
    },
  } as unknown as APIChatInputApplicationCommandInteraction
}

async function run(options: { name: string; value: string }[]) {
  const pending: Promise<unknown>[] = []
  const patched: { embeds?: APIEmbed[] }[] = []
  const patch = vi.fn(async (_route: string, body: { body: { embeds?: APIEmbed[] } }) => {
    patched.push(body.body)
    return {}
  })

  distanceCommand.execute({
    env: { DISCORD_APPLICATION_ID: "app" } as unknown as Env,
    rest: { patch } as unknown as REST,
    interaction: createInteraction(options),
    waitUntil: (promise) => {
      pending.push(promise)
    },
  })
  await Promise.all(pending)

  return patched[0]?.embeds?.[0]
}

const DEFAULT_OPTIONS = [
  { name: "partenza", value: "Milano" },
  { name: "destinazione", value: "Roma" },
]

function geocodeBoth(place: string) {
  return place === "Milano" ? MILANO : ROMA
}

function okRoute(distance: number, duration: number) {
  return { code: "Ok", routes: [{ distance, duration }] }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("distanceCommand", () => {
  it("routes by car and reports converted distance and duration", async () => {
    const calls = stubFetch({ geocoding: geocodeBoth, routing: okRoute(572532.5, 21554.2) })

    const embed = await run(DEFAULT_OPTIONS)

    expect(embed?.fields?.[0]).toMatchObject({ name: "Distanza", value: "572.5 km" })
    expect(embed?.fields?.[1]).toMatchObject({ name: "Durata stimata", value: "5 h 59 min" })
    expect(embed?.fields?.[2]).toMatchObject({ name: "Mezzo usato", value: "Auto" })
    expect(calls.at(-1)).toContain("/routed-car/")
  })

  it("sends coordinates to OSRM as longitude,latitude", async () => {
    const calls = stubFetch({ geocoding: geocodeBoth, routing: okRoute(1000, 60) })

    await run(DEFAULT_OPTIONS)

    expect(calls.at(-1)).toContain("/route/v1/driving/9.18951,45.46427;12.4964,41.9028")
  })

  it("uses the walking profile when mezzo is piedi", async () => {
    const calls = stubFetch({ geocoding: geocodeBoth, routing: okRoute(1168.1, 934.7) })

    const embed = await run([...DEFAULT_OPTIONS, { name: "mezzo", value: "piedi" }])

    expect(calls.at(-1)).toContain("/routed-foot/")
    expect(embed?.fields?.[2]).toMatchObject({ name: "Mezzo usato", value: "A piedi" })
  })

  it("resolves both endpoints to their full place names", async () => {
    stubFetch({ geocoding: geocodeBoth, routing: okRoute(1000, 60) })

    const embed = await run(DEFAULT_OPTIONS)

    expect(embed?.fields?.[3]).toMatchObject({ name: "Partenza", value: "Milano, Lombardia, Italia" })
    expect(embed?.fields?.[4]).toMatchObject({ name: "Destinazione", value: "Roma, Lazio, Italia" })
  })

  it("names the endpoint that could not be geocoded", async () => {
    stubFetch({ geocoding: (place) => (place === "Milano" ? MILANO : undefined), routing: okRoute(1000, 60) })

    const embed = await run([...DEFAULT_OPTIONS.slice(0, 1), { name: "destinazione", value: "Asdfgh" }])

    expect(embed?.description).toBe("Nessun risultato per **Asdfgh**.")
  })

  it("reports no route when OSRM answers with an error code", async () => {
    stubFetch({ geocoding: geocodeBoth, routing: { code: "NoRoute", routes: [] } })

    const embed = await run(DEFAULT_OPTIONS)

    expect(embed?.description).toBe("Nessun percorso trovato per le località indicate.")
  })

  it("reports the service as unavailable when OSRM fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("geocoding-api")
          ? new Response(JSON.stringify({ results: [MILANO] }))
          : new Response("boom", { status: 503 }),
      ),
    )

    const embed = await run(DEFAULT_OPTIONS)

    expect(embed?.description).toBe("Servizio momentaneamente non disponibile, riprova più tardi.")
  })
})
