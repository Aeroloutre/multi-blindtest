import type { SearchResult } from './types'

const artistKey = (name: string) => name.trim().toLowerCase()

type Options = {
  /** Titres à ne pas retirer : déjà dans la manche, ou réservés par une autre manche. */
  excludeIds: number[]
  /** Artistes déjà présents dans la manche. */
  excludeArtists: string[]
}

/**
 * Tire au hasard `count` titres, au plus un par artiste : deux morceaux du même interprète
 * joués en même temps rendent la manche indevinable.
 * Renvoie moins de `count` titres si la playlist n'offre pas assez d'artistes distincts.
 */
export function drawDistinctArtists(
  pool: SearchResult[],
  count: number,
  { excludeIds, excludeArtists }: Options,
): SearchResult[] {
  const artists = new Set(excludeArtists.map(artistKey))
  const picks: SearchResult[] = []

  for (const candidate of [...pool].sort(() => Math.random() - 0.5)) {
    if (picks.length === count) break
    if (excludeIds.includes(candidate.id)) continue
    const artist = artistKey(candidate.artist)
    if (artists.has(artist)) continue
    artists.add(artist)
    picks.push(candidate)
  }
  return picks
}
