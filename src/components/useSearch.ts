import { useEffect, useState } from 'react'
import { searchPlaylists, searchTracks } from '@/lib/deezer'
import type { PlaylistResult, SearchResult } from '@/lib/types'

const MIN_QUERY = 2

function useDebouncedSearch<T>(
  query: string,
  fetcher: (q: string, signal: AbortSignal) => Promise<T[]>,
) {
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      fetcher(q, controller.signal)
        .then((r) => {
          setResults(r)
          setError(undefined)
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError(e.message)
        })
        .finally(() => setLoading(false))
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, fetcher])

  if (query.trim().length < MIN_QUERY) return { results: [], loading: false, error: undefined }
  return { results, loading, error }
}

export function useSearch(query: string): {
  results: SearchResult[]
  loading: boolean
  error?: string
} {
  return useDebouncedSearch(query, searchTracks)
}

export function usePlaylistSearch(query: string): {
  results: PlaylistResult[]
  loading: boolean
  error?: string
} {
  return useDebouncedSearch(query, searchPlaylists)
}
