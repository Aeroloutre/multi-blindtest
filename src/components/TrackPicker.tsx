import { useState } from 'react'
import { DicesIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TrackInfo } from '@/components/TrackInfo'
import { useSearch } from '@/components/useSearch'
import { fetchChart } from '@/lib/deezer'
import { addTrack, useStore } from '@/lib/store'
import { CHART_SOURCES, type ChartSource, type SearchResult } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Morceaux déjà dans la manche en cours : masqués. */
  excluded: number[]
  /** Morceaux pris par une autre manche : affichés mais grisés. */
  reserved: number[]
  onPick: (trackId: number) => void
}

const randomOf = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

export function TrackPicker({ open, onOpenChange, excluded, reserved, onPick }: Props) {
  const { tracks, downloading } = useStore()
  const [query, setQuery] = useState('')
  const [randomizing, setRandomizing] = useState<ChartSource | null>(null)
  const { results, loading } = useSearch(query)

  const q = query.trim().toLowerCase()
  const libraryMatches = tracks.filter(
    (t) =>
      !excluded.includes(t.id) &&
      (!q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
  )
  const remote = results.filter((r) => !tracks.some((t) => t.id === r.id))

  const pick = (id: number) => {
    onPick(id)
    setQuery('')
    onOpenChange(false)
  }

  const pickRemote = async (result: SearchResult) => {
    try {
      pick((await addTrack(result)).id)
    } catch (e) {
      toast.error(`Échec : ${(e as Error).message}`)
    }
  }

  const pickRandom = async (source: ChartSource) => {
    setRandomizing(source)
    try {
      const chart = await fetchChart(source)
      const pool = chart.filter((r) => !excluded.includes(r.id) && !reserved.includes(r.id))
      if (pool.length === 0) {
        toast.error('Tous les titres de ce top sont déjà utilisés.')
        return
      }
      await pickRemote(randomOf(pool))
    } catch (e) {
      toast.error(`Échec : ${(e as Error).message}`)
    } finally {
      setRandomizing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir un morceau</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          {CHART_SOURCES.map((source) => (
            <Button
              key={source.id}
              variant="outline"
              size="lg"
              className="h-10 flex-1"
              disabled={randomizing !== null}
              onClick={() => pickRandom(source.id)}
            >
              {randomizing === source.id ? <Loader2Icon className="animate-spin" /> : <DicesIcon />}
              {source.label}
            </Button>
          ))}
        </div>

        <Input
          type="search"
          placeholder="Filtrer ou rechercher sur Deezer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 text-base"
        />
        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
          {libraryMatches.length > 0 && (
            <h3 className="py-1 text-xs font-medium text-muted-foreground">Bibliothèque</h3>
          )}
          {libraryMatches.map((t) => {
            const taken = reserved.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                disabled={taken}
                onClick={() => pick(t.id)}
                className="flex w-full items-center justify-between gap-2 border-b py-2 text-left last:border-0 disabled:opacity-40"
              >
                <TrackInfo title={t.title} artist={t.artist} feat={t.feat} cover={t.cover} />
                {taken && (
                  <span className="shrink-0 text-xs text-muted-foreground">Dans une manche</span>
                )}
              </button>
            )
          })}

          {q.length >= 2 && (
            <h3 className="pt-3 pb-1 text-xs font-medium text-muted-foreground">
              Deezer {loading && '…'}
            </h3>
          )}
          {q.length >= 2 &&
            remote.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={downloading.includes(r.id)}
                onClick={() => pickRemote(r)}
                className="flex w-full items-center justify-between gap-2 border-b py-2 text-left last:border-0 disabled:opacity-60"
              >
                <TrackInfo title={r.title} artist={r.artist} feat={r.feat} cover={r.cover} />
                {downloading.includes(r.id) && <Loader2Icon className="size-4 shrink-0 animate-spin" />}
              </button>
            ))}

          {libraryMatches.length === 0 && q.length < 2 && (
            <p className="py-2 text-muted-foreground">
              Tire un titre au hasard dans un top, ou tape un nom pour chercher sur Deezer.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
