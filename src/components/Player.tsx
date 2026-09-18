import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  HeadphonesIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { TrackInfo } from '@/components/TrackInfo'
import { Mixer, type ChannelState } from '@/lib/mixer'
import { saveRound, useStore } from '@/lib/store'
import type { Round } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  round: Round
  onBack: () => void
}

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

export function Player({ round, onBack }: Props) {
  const { tracks } = useStore()
  const mixerRef = useRef<Mixer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<Mixer['status']>('stopped')
  const [elapsed, setElapsed] = useState(0)
  const [channels, setChannels] = useState<ChannelState[]>(() =>
    round.slots.map((s) => ({ volume: s.volume, muted: false, solo: false })),
  )

  const slotTracks = round.slots.map((s) => tracks.find((t) => t.id === s.trackId))
  const normGains = slotTracks.map((t) => t?.normGain ?? 1)

  useEffect(() => {
    const mixer = new Mixer()
    mixerRef.current = mixer
    mixer
      .load(round.slots, tracks)
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message))
    return () => {
      mixer.dispose()
      mixerRef.current = null
    }
    // Le mixeur est construit une seule fois par manche.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id])

  useEffect(() => {
    mixerRef.current?.apply(channels, normGains)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, ready])

  useEffect(() => {
    if (status !== 'playing') return
    const timer = setInterval(() => setElapsed(mixerRef.current?.elapsed() ?? 0), 250)
    return () => clearInterval(timer)
  }, [status])

  // Mémorise les volumes réglés dans la manche.
  const volumes = channels.map((c) => c.volume).join()
  useEffect(() => {
    if (volumes === round.slots.map((s) => s.volume).join()) return
    const timer = setTimeout(() => {
      void saveRound({
        ...round,
        slots: round.slots.map((s, i) => ({ ...s, volume: channels[i].volume })),
      })
    }, 500)
    return () => clearTimeout(timer)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [volumes])

  const update = (index: number, patch: Partial<ChannelState>) =>
    setChannels((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))

  const togglePlay = async () => {
    const mixer = mixerRef.current
    if (!mixer) return
    if (mixer.status === 'playing') await mixer.pause()
    else await mixer.play()
    setStatus(mixer.status)
  }

  const stop = () => {
    mixerRef.current?.stop()
    setStatus('stopped')
    setElapsed(0)
  }

  const reset = () => setChannels((prev) => prev.map((c) => ({ ...c, muted: false, solo: false })))

  const anySolo = channels.some((c) => c.solo)

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-3">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon-lg" onClick={onBack} aria-label="Retour">
          <ArrowLeftIcon />
        </Button>
        <h1 className="flex-1 truncate text-lg font-semibold">{round.name}</h1>
        <span className="font-mono text-muted-foreground tabular-nums">{formatTime(elapsed)}</span>
      </header>

      {error && <p className="text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        {round.slots.map((slot, i) => {
          const track = slotTracks[i]
          const ch = channels[i]
          const audible = !ch.muted && (!anySolo || ch.solo)
          return (
            <div
              key={slot.trackId}
              className={cn('flex flex-col gap-2 rounded-xl border p-3 transition-opacity', !audible && 'opacity-50')}
            >
              <div className="flex items-center justify-between gap-2">
                <TrackInfo
                  title={track?.title ?? '?'}
                  artist={track?.artist ?? '?'}
                  feat={track?.feat}
                  cover={track?.cover}
                  className={cn(ch.muted && 'line-through')}
                />
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant={ch.solo ? 'default' : 'outline'}
                    size="icon-lg"
                    onClick={() => update(i, { solo: !ch.solo })}
                    aria-label="Isoler"
                    aria-pressed={ch.solo}
                  >
                    <HeadphonesIcon />
                  </Button>
                  <Button
                    variant={ch.muted ? 'destructive' : 'outline'}
                    size="icon-lg"
                    onClick={() => update(i, { muted: !ch.muted })}
                    aria-label="Couper"
                    aria-pressed={ch.muted}
                  >
                    {ch.muted ? <VolumeXIcon /> : <Volume2Icon />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Slider
                  min={0}
                  max={150}
                  step={5}
                  value={[ch.volume]}
                  onValueChange={(v) => update(i, { volume: typeof v === 'number' ? v : v[0] })}
                />
                <span className="w-11 shrink-0 text-right text-muted-foreground tabular-nums">
                  {ch.volume}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <footer className="sticky bottom-0 mt-auto flex gap-2 bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" size="lg" className="h-12" onClick={reset} aria-label="Tout réactiver">
          <RotateCcwIcon />
        </Button>
        <Button variant="outline" size="lg" className="h-12" onClick={stop} disabled={status === 'stopped'}>
          <SquareIcon /> Stop
        </Button>
        <Button size="lg" className="h-12 flex-1 text-base" onClick={togglePlay} disabled={!ready}>
          {!ready ? (
            <Loader2Icon className="animate-spin" />
          ) : status === 'playing' ? (
            <>
              <PauseIcon /> Pause
            </>
          ) : (
            <>
              <PlayIcon /> Lecture
            </>
          )}
        </Button>
      </footer>
    </div>
  )
}
