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

export async function searchGif(apiKey: string, query: string) {
  const params = new URLSearchParams({
    q: query,
    per_page: PER_PAGE,
    content_filter: CONTENT_FILTER,
    format_filter: "gif",
  })
  const body = await fetchJson<KlipySearchResult>(`${KLIPY_BASE}/${encodeURIComponent(apiKey)}/gifs/search?${params}`)
  return body.data?.data?.[0]?.file?.md?.gif?.url ?? null
}
