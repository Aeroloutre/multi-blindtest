import { useState } from 'react'
import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrackInfo } from '@/components/TrackInfo'
import { useSearch } from '@/components/useSearch'
import { addTrack, removeTrack, roundsUsing, useStore } from '@/lib/store'
import type { SearchResult } from '@/lib/types'

export function LibraryView() {
  const { tracks, downloading } = useStore()
  const [query, setQuery] = useState('')
  const { results, loading, error } = useSearch(query)

  const add = (result: SearchResult) =>
    addTrack(result).catch((e: Error) => toast.error(`Échec : ${e.message}`))

  const remove = async (id: number) => {
    const used = roundsUsing(id)
    if (used.length > 0) {
      toast.error(`Utilisé dans : ${used.map((r) => r.name).join(', ')}`)
      return
    }
    await removeTrack(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher un titre ou un artiste"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 pl-8 text-base"
        />
      </div>

      {query.trim().length >= 2 ? (
        <section className="flex flex-col">
          {loading && <p className="py-2 text-muted-foreground">Recherche…</p>}
          {error && <p className="py-2 text-destructive">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="py-2 text-muted-foreground">Aucun résultat.</p>
          )}
          {results.map((r) => {
            const inLibrary = tracks.some((t) => t.id === r.id)
            const busy = downloading.includes(r.id)
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                <TrackInfo title={r.title} artist={r.artist} feat={r.feat} cover={r.cover} />
                <Button
                  variant={inLibrary ? 'ghost' : 'outline'}
                  size="icon-lg"
                  disabled={inLibrary || busy}
                  onClick={() => add(r)}
                  aria-label="Ajouter"
                >
                  {busy ? <Loader2Icon className="animate-spin" /> : inLibrary ? <CheckIcon /> : <PlusIcon />}
                </Button>
              </div>
            )
          })}
        </section>
      ) : (
        <section className="flex flex-col">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">
            Mes morceaux ({tracks.length})
          </h2>
          {tracks.length === 0 && (
            <p className="py-2 text-muted-foreground">
              Recherche un morceau pour l'ajouter. L'extrait de 30 s est stocké sur l'appareil.
            </p>
          )}
          {tracks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
              <TrackInfo title={t.title} artist={t.artist} feat={t.feat} cover={t.cover} />
              <Button variant="ghost" size="icon-lg" onClick={() => remove(t.id)} aria-label="Supprimer">
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
