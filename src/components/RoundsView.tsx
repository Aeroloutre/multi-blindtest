import { useState } from 'react'
import { ChevronDownIcon, PencilIcon, PlayIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removeRound, useStore } from '@/lib/store'
import type { Round } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  onCreate: () => void
  onEdit: (round: Round) => void
  onPlay: (round: Round) => void
}

export function RoundsView({ onCreate, onEdit, onPlay }: Props) {
  const { rounds, tracks } = useStore()
  const [expanded, setExpanded] = useState<string[]>([])

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const remove = (round: Round) => {
    if (confirm(`Supprimer « ${round.name} » ?`)) void removeRound(round.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" className="h-10" onClick={onCreate}>
        <PlusIcon /> Nouvelle manche
      </Button>

      {rounds.length === 0 && (
        <p className="py-2 text-muted-foreground">
          Aucune manche. Ajoute des morceaux dans la bibliothèque puis crée une manche de 5 titres.
        </p>
      )}

      {rounds.map((round) => {
        const open = expanded.includes(round.id)
        return (
          <div key={round.id} className="rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch text-left"
                onClick={() => toggle(round.id)}
                aria-expanded={open}
              >
                <ChevronDownIcon
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    !open && '-rotate-90',
                  )}
                />
                <h3 className="truncate font-medium">{round.name}</h3>
              </button>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-lg" onClick={() => remove(round)} aria-label="Supprimer">
                  <Trash2Icon />
                </Button>
                <Button variant="ghost" size="icon-lg" onClick={() => onEdit(round)} aria-label="Modifier">
                  <PencilIcon />
                </Button>
                <Button size="icon-lg" onClick={() => onPlay(round)} aria-label="Jouer">
                  <PlayIcon />
                </Button>
              </div>
            </div>
            {open && (
              <ul className="mt-1 pl-5.5 text-sm text-muted-foreground">
                {round.slots.map((slot, i) => {
                  const t = tracks.find((t) => t.id === slot.trackId)
                  return (
                    <li key={i} className="truncate">
                      {t ? `${t.artist} — ${t.title}` : 'Morceau supprimé'}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
