import { useEffect, useState } from 'react'
import { searchTracks } from '@/lib/deezer'
import type { SearchResult } from '@/lib/types'

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      searchTracks(q, controller.signal)
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
  }, [query])

  if (query.trim().length < 2) return { results: [], loading: false, error: undefined }
  return { results, loading, error }
}
