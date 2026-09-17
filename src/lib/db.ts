import { createStore, del, get, set, values } from 'idb-keyval'
import type { Round, Track } from './types'

const tracksStore = createStore('mbt-tracks', 'tracks')
const audioStore = createStore('mbt-audio', 'audio')
const roundsStore = createStore('mbt-rounds', 'rounds')

export const db = {
  tracks: () => values<Track>(tracksStore),
  putTrack: (track: Track, audio: ArrayBuffer) =>
    set(track.id, audio, audioStore).then(() => set(track.id, track, tracksStore)),
  deleteTrack: (id: number) => del(id, tracksStore).then(() => del(id, audioStore)),
  audio: (id: number) => get<ArrayBuffer>(id, audioStore),

  rounds: () => values<Round>(roundsStore),
  putRound: (round: Round) => set(round.id, round, roundsStore),
  deleteRound: (id: string) => del(id, roundsStore),
}
