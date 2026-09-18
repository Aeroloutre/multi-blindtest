import { useState } from 'react'
import { ArrowLeftIcon, ListMusicIcon, Loader2Icon, ShuffleIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { TrackInfo } from '@/components/TrackInfo'
import { TrackPicker } from '@/components/TrackPicker'
import { usePlaylistSearch } from '@/components/useSearch'
import { fetchPlaylist, parsePlaylistId } from '@/lib/deezer'
import { drawDistinctArtists } from '@/lib/draw'
import { addTrack, reservedTrackIds, saveRound, useStore } from '@/lib/store'
import { DEFAULT_START, SLOTS_PER_ROUND, type Round, type Slot } from '@/lib/types'

type Props = {
  round?: Round
  onDone: () => void
}

const sliderValue = (v: number | readonly number[]) => (typeof v === 'number' ? v : v[0])

export function RoundEditor({ round, onDone }: Props) {
  const { tracks, rounds } = useStore()
  const [name, setName] = useState(round?.name ?? `Manche ${rounds.length + 1}`)
  const [slots, setSlots] = useState<(Slot | null)[]>(
    () => round?.slots ?? Array(SLOTS_PER_ROUND).fill(null),
  )
  const [picking, setPicking] = useState<number | null>(null)
  const [playlist, setPlaylist] = useState(round?.playlist)
  const [playlistQuery, setPlaylistQuery] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const { results: playlistHits, loading: searching } = usePlaylistSearch(
    playlist ? '' : playlistQuery,
  )
  // Un lien collé court-circuite la recherche : son titre sera résolu au tirage.
  const pastedId = parsePlaylistId(playlistQuery)

  const used = slots.flatMap((s) => (s ? [s.trackId] : []))
  // Un morceau pris par une autre manche ne peut pas être réutilisé ici.
  const reserved = reservedTrackIds(round?.id)
  const complete = slots.every(Boolean)

  const attach = (chosen: { id: number; title: string }) => {
    setPlaylist(chosen)
    setPlaylistQuery('')
  }

  const setSlot = (index: number, slot: Slot | null) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? slot : s)))

  const fillRandom = () => {
    const pool = tracks
      .filter((t) => !used.includes(t.id) && !reserved.includes(t.id))
      .sort(() => Math.random() - 0.5)
    const empty = slots.filter((s) => !s).length
    if (pool.length < empty) {
      toast.error(
        `Pas assez de morceaux libres dans la bibliothèque (${pool.length} dispo.) — tire dans un top.`,
      )
    }
    setSlots((prev) =>
      prev.map((s) => {
        if (s) return s
        const t = pool.shift()
        return t ? { trackId: t.id, start: DEFAULT_START, volume: 100 } : null
      }),
    )
  }

  /**
   * Tire des titres dans une playlist Deezer publique : un seul par artiste, pour qu'une manche
   * ne superpose jamais deux morceaux du même interprète. Une manche déjà pleine est relancée.
   */
  const generate = async () => {
    const id = playlist?.id ?? pastedId
    if (!id) {
      toast.error('Choisis une playlist dans la liste, ou colle son lien.')
      return
    }

    const replaceAll = complete
    const kept = replaceAll ? [] : slots.flatMap((s) => (s ? [s] : []))
    const needed = SLOTS_PER_ROUND - kept.length

    setProgress({ done: 0, total: 0 })
    try {
      const chart = await fetchPlaylist(id)
      setPlaylist({ id, title: chart.title ?? 'Playlist' })

      // Les artistes déjà présents dans la manche comptent dans la règle « un titre par artiste ».
      const picks = drawDistinctArtists(chart.results, needed, {
        excludeIds: [...kept.map((s) => s.trackId), ...reserved],
        excludeArtists: kept.flatMap((s) => {
          const t = tracks.find((t) => t.id === s.trackId)
          return t ? [t.artist] : []
        }),
      })

      if (picks.length < needed) {
        toast.error(
          `Playlist trop étroite : ${picks.length} titre(s) utilisable(s) sur ${needed} (un seul par artiste, hors titres déjà pris ailleurs).`,
        )
      }

      // Téléchargement séquentiel : un extrait qui échoue ne fait pas perdre les autres.
      setProgress({ done: 0, total: picks.length })
      const ready: number[] = []
      for (const pick of picks) {
        try {
          ready.push((await addTrack(pick)).id)
        } catch {
          // titre ignoré, signalé après la boucle
        }
        setProgress((p) => p && { ...p, done: p.done + 1 })
      }
      const failed = picks.length - ready.length
      if (failed > 0) toast.error(`${failed} extrait(s) indisponible(s) au téléchargement.`)

      const queue = [...ready]
      setSlots((prev) =>
        (replaceAll ? Array<Slot | null>(SLOTS_PER_ROUND).fill(null) : prev).map((s) => {
          if (s) return s
          const trackId = queue.shift()
          return trackId ? { trackId, start: DEFAULT_START, volume: 100 } : null
        }),
      )
    } catch (e) {
      toast.error(`Échec : ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  const save = async () => {
    await saveRound({
      id: round?.id ?? crypto.randomUUID(),
      createdAt: round?.createdAt ?? Date.now(),
      name: name.trim() || 'Manche',
      slots: slots as Slot[],
      playlist,
    })
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon-lg" onClick={onDone} aria-label="Retour">
          <ArrowLeftIcon />
        </Button>
        <h1 className="text-lg font-semibold">{round ? 'Modifier la manche' : 'Nouvelle manche'}</h1>
      </header>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Titre</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. : Années 80"
          className="h-10 text-base"
        />
      </label>

      <div className="flex flex-col gap-2 rounded-xl border p-3">
        <span className="text-sm font-medium text-muted-foreground">Playlist Deezer</span>
        {playlist ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{playlist.title}</span>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setPlaylist(undefined)}
              aria-label="Changer de playlist"
            >
              <XIcon />
            </Button>
          </div>
        ) : (
          <>
            <Input
              type="search"
              value={playlistQuery}
              onChange={(e) => setPlaylistQuery(e.target.value)}
              placeholder="Ex. : années 80 — ou coller un lien Deezer"
              className="h-10 text-base"
            />
            {pastedId ? (
              <button
                type="button"
                className="border-b py-2 text-left"
                onClick={() => attach({ id: pastedId, title: 'Playlist' })}
              >
                <TrackInfo title="Utiliser ce lien" artist={`Playlist ${pastedId}`} />
              </button>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {searching && playlistHits.length === 0 && (
                  <p className="py-2 text-muted-foreground">Recherche…</p>
                )}
                {playlistHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full border-b py-2 text-left last:border-0"
                    onClick={() => attach({ id: p.id, title: p.title })}
                  >
                    <TrackInfo
                      title={p.title}
                      artist={`${p.owner} · ${p.tracks} titres`}
                      cover={p.cover}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <Button
          variant="outline"
          size="lg"
          className="h-10"
          disabled={progress !== null || (!playlist && !pastedId)}
          onClick={() => void generate()}
        >
          {progress ? <Loader2Icon className="animate-spin" /> : <ListMusicIcon />}
          {progress
            ? progress.total === 0
              ? 'Lecture de la playlist…'
              : `Téléchargement ${progress.done}/${progress.total}…`
            : complete
              ? 'Relancer la manche'
              : 'Générer la manche'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {slots.map((slot, i) => {
          const track = slot && tracks.find((t) => t.id === slot.trackId)
          if (!slot || !track) {
            return (
              <Button
                key={i}
                variant="outline"
                className="h-16 justify-start border-dashed text-muted-foreground"
                onClick={() => setPicking(i)}
              >
                {i + 1}. Choisir un morceau
              </Button>
            )
          }
          const maxStart = Math.max(0, Math.floor(track.duration) - 5)
          return (
            <div key={i} className="flex flex-col gap-3 rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="min-w-0 text-left" onClick={() => setPicking(i)}>
                  <TrackInfo title={track.title} artist={track.artist} cover={track.cover} />
                </button>
                <Button variant="ghost" size="icon-lg" onClick={() => setSlot(i, null)} aria-label="Retirer">
                  <XIcon />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground">Départ {slot.start} s</span>
                <Slider
                  min={0}
                  max={maxStart}
                  step={1}
                  value={[slot.start]}
                  onValueChange={(v) => setSlot(i, { ...slot, start: sliderValue(v) })}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        {!complete && (
          <Button variant="outline" size="lg" className="h-10 flex-1" onClick={fillRandom}>
            <ShuffleIcon /> Compléter au hasard
          </Button>
        )}
        <Button size="lg" className="h-10 flex-1" disabled={!complete} onClick={save}>
          Enregistrer
        </Button>
      </div>

      <TrackPicker
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        excluded={used}
        reserved={reserved}
        onPick={(trackId) => {
          if (picking === null) return
          setSlot(picking, { trackId, start: DEFAULT_START, volume: slots[picking]?.volume ?? 100 })
        }}
      />
    </div>
  )
}
