export type SearchResult = {
  id: number
  title: string
  artist: string
  album: string
  cover: string
}

export type Track = SearchResult & {
  /** Durée réelle de l'extrait, en secondes. */
  duration: number
  /** Gain linéaire qui ramène l'extrait au niveau cible (normalisation). */
  normGain: number
  addedAt: number
}

export type Slot = {
  trackId: number
  /** Position de départ dans l'extrait, en secondes. */
  start: number
  /** Volume réglé par l'animateur, en % (100 = niveau normalisé). */
  volume: number
}

export type Round = {
  id: string
  name: string
  slots: Slot[]
  createdAt: number
}

export const SLOTS_PER_ROUND = 5
export const DEFAULT_START = 0
