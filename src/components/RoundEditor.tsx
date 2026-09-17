import { useState } from 'react'
import { ArrowLeftIcon, ShuffleIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { TrackInfo } from '@/components/TrackInfo'
import { TrackPicker } from '@/components/TrackPicker'
import { saveRound, useStore } from '@/lib/store'
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

  const used = slots.flatMap((s) => (s ? [s.trackId] : []))
  const complete = slots.every(Boolean)

  const setSlot = (index: number, slot: Slot | null) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? slot : s)))

  const fillRandom = () => {
    const pool = tracks.filter((t) => !used.includes(t.id)).sort(() => Math.random() - 0.5)
    const empty = slots.filter((s) => !s).length
    if (pool.length < empty) {
      toast.error(`Pas assez de morceaux dans la bibliothèque (${pool.length} dispo.)`)
    }
    setSlots((prev) =>
      prev.map((s) => {
        if (s) return s
        const t = pool.shift()
        return t ? { trackId: t.id, start: DEFAULT_START, volume: 100 } : null
      }),
    )
  }

  const save = async () => {
    await saveRound({
      id: round?.id ?? crypto.randomUUID(),
      createdAt: round?.createdAt ?? Date.now(),
      name: name.trim() || 'Manche',
      slots: slots as Slot[],
    })
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon-lg" onClick={onDone} aria-label="Retour">
          <ArrowLeftIcon />
        </Button>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-base" />
      </header>

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
        onPick={(trackId) => {
          if (picking === null) return
          setSlot(picking, { trackId, start: DEFAULT_START, volume: slots[picking]?.volume ?? 100 })
        }}
      />
    </div>
  )
}
