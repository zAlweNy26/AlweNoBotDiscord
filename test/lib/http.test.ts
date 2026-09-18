import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchJson } from "../../src/lib/http"

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function hangingFetch(_input: RequestInfo | URL, init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal
    if (!signal) return
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    signal.addEventListener("abort", () => reject(signal.reason), { once: true })
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchJson", () => {
  it("parses a successful response", async () => {
    const fetchMock = stubFetch(async () => Response.json({ ok: true }))
    await expect(fetchJson<{ ok: boolean }>("https://example.com/data")).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("throws on a non-ok response", async () => {
    stubFetch(async () => new Response(null, { status: 500 }))
    await expect(fetchJson("https://example.com/data")).rejects.toThrow("HTTP 500 for https://example.com/data")
  })

  it("aborts when the timeout elapses", async () => {
    stubFetch(hangingFetch)
    await expect(fetchJson("https://example.com/data", undefined, 5)).rejects.toThrow()
  })

  it("aborts when the caller signal aborts", async () => {
    stubFetch(hangingFetch)
    const controller = new AbortController()
    const response = fetchJson("https://example.com/data", { signal: controller.signal }, 60_000)
    controller.abort(new Error("caller aborted"))
    await expect(response).rejects.toThrow("caller aborted")
  })
})
