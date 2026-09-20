import { fetchJson } from "./http"

const KLIPY_BASE = "https://api.klipy.com/api/v1"
const CONTENT_FILTER = "medium"
const PER_PAGE = "8"

interface KlipySearchResult {
  result: boolean
  data?: {
    data?: Array<{
      file?: {
        md?: {
          gif?: {
            url?: string
          }
        }
      }
    }>
  }
}

export async function searchGif(apiKey: string, query: string, random: () => number = Math.random) {
  const params = new URLSearchParams({
    q: query,
    per_page: PER_PAGE,
    content_filter: CONTENT_FILTER,
    format_filter: "gif",
  })
  const body = await fetchJson<KlipySearchResult>(`${KLIPY_BASE}/${encodeURIComponent(apiKey)}/gifs/search?${params}`)
  const urls = (body.data?.data ?? []).flatMap((result) => {
    const url = result.file?.md?.gif?.url
    return url ? [url] : []
  })
  const index = Math.min(Math.floor(random() * urls.length), urls.length - 1)
  return urls[index] ?? null
}
