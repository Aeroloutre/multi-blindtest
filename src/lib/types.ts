export type SearchResult = {
  id: number
  title: string
  artist: string
  /** Ex. « feat. Pharrell Williams » — absent si le titre n'a pas de featuring. */
  feat?: string
  album: string
  cover: string
}

export type PlaylistResult = {
  id: number
  title: string
  /** Nombre de titres annoncé par Deezer, avant filtrage des extraits indisponibles. */
  tracks: number
  owner: string
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
  /** Playlist Deezer d'où la manche a été tirée, pour pouvoir relancer un tirage. */
  playlist?: { id: number; title: string }
}

export const SLOTS_PER_ROUND = 5
export const DEFAULT_START = 0

/** Tops Deezer proposés par le bouton « au hasard ». */
export const CHART_SOURCES = [
  { id: 'fr', label: 'Top France' },
  { id: 'monde', label: 'Top Monde' },
] as const

export type ChartSource = (typeof CHART_SOURCES)[number]['id']
