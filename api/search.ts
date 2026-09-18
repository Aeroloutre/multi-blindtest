// Proxy de recherche Deezer : l'API publique n'envoie pas d'en-têtes CORS.

// Deezer sépare parfois le featuring dans `title_version` (ex. "(feat. X)"), mais ce champ
// contient aussi d'autres mentions ("Acoustic Version", "Radio Edit"...) qu'on ne veut pas afficher.
function parseFeat(titleVersion: string | undefined): string | undefined {
  const match = titleVersion?.match(/(?:feat\.?|ft\.?|featuring)\s+(.+)/i)
  return match ? `feat. ${match[1].replace(/\)+\s*$/, '').trim()}` : undefined
}

type DeezerTrack = {
  id: number
  title: string
  title_short: string
  title_version: string
  duration: number
  preview: string
  artist: { name: string }
  album: { title: string; cover_medium: string }
}

type DeezerPlaylist = {
  id: number
  title: string
  nb_tracks: number
  picture_medium: string
  user: { name: string }
}

/** Une manche demande 5 titres : en dessous, la playlist ne sert à rien. */
const MIN_PLAYLIST_TRACKS = 5

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const q = params.get('q')?.trim()
  const playlists = params.get('type') === 'playlist'
  if (!q) return Response.json({ results: [] })

  const upstream = await fetch(
    `https://api.deezer.com/search${playlists ? '/playlist' : ''}?limit=25&q=${encodeURIComponent(q)}`,
  )
  const body = (await upstream.json()) as {
    data?: (DeezerTrack & DeezerPlaylist)[]
    error?: { message: string }
  }
  if (!upstream.ok || body.error) {
    return Response.json({ error: body.error?.message ?? 'Deezer indisponible' }, { status: 502 })
  }

  const data = body.data ?? []
  const results = playlists
    ? data
        .filter((p) => p.nb_tracks >= MIN_PLAYLIST_TRACKS)
        .map((p) => ({
          id: p.id,
          title: p.title,
          tracks: p.nb_tracks,
          owner: p.user.name,
          cover: p.picture_medium,
        }))
    : data
        .filter((t) => t.preview)
        .map((t) => ({
          id: t.id,
          title: t.title_short || t.title,
          artist: t.artist.name,
          feat: parseFeat(t.title_version),
          album: t.album.title,
          cover: t.album.cover_medium,
        }))

  return Response.json(
    { results },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
  )
}
