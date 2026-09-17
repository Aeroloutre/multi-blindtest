import { useSyncExternalStore } from 'react'
import { db } from './db'
import { decode, gainFor, measureLufs } from './loudness'
import { downloadPreview } from './deezer'
import type { Round, SearchResult, Track } from './types'

type State = {
  loaded: boolean
  tracks: Track[]
  rounds: Round[]
  downloading: number[]
}

let state: State = { loaded: false, tracks: [], rounds: [], downloading: [] }
const listeners = new Set<() => void>()

function update(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useStore(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}

export async function loadStore() {
  const [tracks, rounds] = await Promise.all([db.tracks(), db.rounds()])
  update({
    loaded: true,
    tracks: tracks.sort((a, b) => b.addedAt - a.addedAt),
    rounds: rounds.sort((a, b) => b.createdAt - a.createdAt),
  })
}

export async function addTrack(result: SearchResult): Promise<Track> {
  const existing = state.tracks.find((t) => t.id === result.id)
  if (existing) return existing

  update({ downloading: [...state.downloading, result.id] })
  try {
    const audio = await downloadPreview(result.id)
    const buffer = await decode(audio)
    const track: Track = {
      ...result,
      duration: buffer.duration,
      normGain: gainFor(await measureLufs(buffer)),
      addedAt: Date.now(),
    }
    await db.putTrack(track, audio)
    update({ tracks: [track, ...state.tracks] })
    return track
  } finally {
    update({ downloading: state.downloading.filter((id) => id !== result.id) })
  }
}

export function roundsUsing(trackId: number): Round[] {
  return state.rounds.filter((r) => r.slots.some((s) => s.trackId === trackId))
}

export async function removeTrack(id: number) {
  await db.deleteTrack(id)
  update({ tracks: state.tracks.filter((t) => t.id !== id) })
}

export async function saveRound(round: Round) {
  await db.putRound(round)
  const others = state.rounds.filter((r) => r.id !== round.id)
  update({ rounds: [round, ...others].sort((a, b) => b.createdAt - a.createdAt) })
}

export async function removeRound(id: string) {
  await db.deleteRound(id)
  update({ rounds: state.rounds.filter((r) => r.id !== id) })
}
