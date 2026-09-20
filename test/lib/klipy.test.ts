import { afterEach, describe, expect, it, vi } from "vitest"
import { searchGif } from "../../src/lib/klipy"

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function gifResponse(url: string) {
  return Response.json({ result: true, data: { data: [{ file: { md: { gif: { url } } } }] } })
}

function gifResults(entries: Array<{ url?: string }>) {
  return Response.json({
    result: true,
    data: { data: entries.map((entry) => ({ file: { md: { gif: { url: entry.url } } } })) },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("searchGif", () => {
  it("queries klipy with the key and the search parameters", async () => {
    const fetchMock = stubFetch(async () => Response.json({ result: true, data: { data: [] } }))
    await searchGif("key-123", "cane che balla")

    expect(fetchMock).toHaveBeenCalledOnce()
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.origin + url.pathname).toBe("https://api.klipy.com/api/v1/key-123/gifs/search")
    expect(url.searchParams.get("q")).toBe("cane che balla")
    expect(url.searchParams.get("per_page")).toBe("8")
    expect(url.searchParams.get("content_filter")).toBe("medium")
    expect(url.searchParams.get("format_filter")).toBe("gif")
  })

  it("returns the md gif of the first result", async () => {
    stubFetch(async () => gifResponse("https://static.klipy.com/ii/abc/1f/2e/cane.gif"))
    await expect(searchGif("key-123", "cane")).resolves.toBe("https://static.klipy.com/ii/abc/1f/2e/cane.gif")
  })

  it("returns null when the search has no results", async () => {
    stubFetch(async () => Response.json({ result: true, data: { data: [] } }))
    await expect(searchGif("key-123", "niente")).resolves.toBeNull()
  })

  it("picks one of the results at random", async () => {
    stubFetch(async () =>
      gifResults([
        { url: "https://static.klipy.com/a.gif" },
        { url: "https://static.klipy.com/b.gif" },
        { url: "https://static.klipy.com/c.gif" },
      ]),
    )

    await expect(searchGif("key-123", "cane", () => 0)).resolves.toBe("https://static.klipy.com/a.gif")
    await expect(searchGif("key-123", "cane", () => 0.5)).resolves.toBe("https://static.klipy.com/b.gif")
    await expect(searchGif("key-123", "cane", () => 0.99)).resolves.toBe("https://static.klipy.com/c.gif")
  })

  it("skips results without a usable md gif when picking", async () => {
    stubFetch(async () => gifResults([{}, { url: "https://static.klipy.com/b.gif" }]))

    await expect(searchGif("key-123", "cane", () => 0)).resolves.toBe("https://static.klipy.com/b.gif")
  })

  it("returns null when no result carries an md gif", async () => {
    stubFetch(async () => gifResults([{}, {}]))
    await expect(searchGif("key-123", "cane")).resolves.toBeNull()
  })

  it("throws on a non-ok response", async () => {
    stubFetch(async () => new Response(null, { status: 500 }))
    await expect(searchGif("key-123", "cane")).rejects.toThrow("HTTP 500")
  })
})
