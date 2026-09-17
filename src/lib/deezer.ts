import type { SearchResult } from './types'

export async function searchTracks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Recherche impossible')
  return body.results
}

export async function downloadPreview(id: number): Promise<ArrayBuffer> {
  const res = await fetch(`/api/preview?id=${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.arrayBuffer()
}
