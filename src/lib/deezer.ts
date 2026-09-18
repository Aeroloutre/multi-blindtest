import type { ChartSource, PlaylistResult, SearchResult } from './types'

export async function searchTracks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Recherche impossible')
  return body.results
}

export async function searchPlaylists(
  query: string,
  signal?: AbortSignal,
): Promise<PlaylistResult[]> {
  const res = await fetch(`/api/search?type=playlist&q=${encodeURIComponent(query)}`, { signal })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Recherche impossible')
  return body.results
}

export async function downloadPreview(id: number): Promise<ArrayBuffer> {
  const res = await fetch(`/api/preview?id=${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.arrayBuffer()
}

type Chart = { title?: string; results: SearchResult[] }

const chartCache = new Map<string, Promise<Chart>>()

function fetchSource(key: string, param: string): Promise<Chart> {
  const cached = chartCache.get(key)
  if (cached) return cached

  const pending = (async () => {
    const res = await fetch(`/api/charts?${param}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? 'Top indisponible')
    return body as Chart
  })()
  chartCache.set(key, pending)
  pending.catch(() => chartCache.delete(key))
  return pending
}

/** Titres d'un top Deezer prédéfini, mis en cache pour la session. */
export async function fetchChart(source: ChartSource): Promise<SearchResult[]> {
  return (await fetchSource(source, `source=${source}`)).results
}

/** Titres d'une playlist Deezer publique, avec son nom. */
export function fetchPlaylist(id: number): Promise<Chart> {
  return fetchSource(`playlist:${id}`, `playlist=${id}`)
}

/**
 * Accepte un id brut ou une URL Deezer collée
 * (`deezer.com/fr/playlist/123`, `deezer.page.link/...` non géré : lien court non résolvable).
 */
export function parsePlaylistId(input: string): number | null {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const match = trimmed.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/i)
  return match ? Number(match[1]) : null
}
