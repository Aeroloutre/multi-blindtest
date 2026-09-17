import { useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TrackInfo } from '@/components/TrackInfo'
import { useSearch } from '@/components/useSearch'
import { addTrack, useStore } from '@/lib/store'
import type { SearchResult } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  excluded: number[]
  onPick: (trackId: number) => void
}

export function TrackPicker({ open, onOpenChange, excluded, onPick }: Props) {
  const { tracks, downloading } = useStore()
  const [query, setQuery] = useState('')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir un morceau</DialogTitle>
        </DialogHeader>
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
          {libraryMatches.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className="flex w-full border-b py-2 text-left last:border-0"
            >
              <TrackInfo title={t.title} artist={t.artist} cover={t.cover} />
            </button>
          ))}

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
                <TrackInfo title={r.title} artist={r.artist} cover={r.cover} />
                {downloading.includes(r.id) && <Loader2Icon className="size-4 shrink-0 animate-spin" />}
              </button>
            ))}

          {libraryMatches.length === 0 && q.length < 2 && (
            <p className="py-2 text-muted-foreground">Tape un nom pour chercher sur Deezer.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
