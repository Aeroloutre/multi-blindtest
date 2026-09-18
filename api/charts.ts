// Tops Deezer : l'API n'expose pas de « top 300 » par pays.
// Les charts officielles sont des playlists du compte « Deezer Charts », plafonnées à ~100 titres :
// on en cumule plusieurs par source pour obtenir un vivier plus large.
type DeezerTrack = {
  id: number
  title: string
  preview: string
  artist: { name: string }
  album: { title: string; cover_medium: string }
}

type DeezerError = { message: string; code: number }

const SOURCES: Record<string, number[]> = {
  // Top France, Top France 2025, Top France 2024 → ~300 titres
  fr: [1109890291, 14591586961, 13275485563],
  // Top Worldwide, Top Worldwide 2025 → ~170 titres (Deezer n'en publie pas plus)
  monde: [3155776842, 14575176963],
}

const PAGE = 100
const MAX_PER_PLAYLIST = 300

/** Deezer répond 200 avec un corps `{ error }` : on traduit ça en statut HTTP utile. */
class UpstreamError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function deezer<T>(path: string): Promise<T> {
  const upstream = await fetch(`https://api.deezer.com/${path}`)
  const body = (await upstream.json()) as T & { error?: DeezerError }
  // Code 800 « no data » : playlist inexistante, supprimée ou passée en privé.
  if (body.error?.code === 800) {
    throw new UpstreamError('Playlist introuvable — vérifie qu’elle est publique.', 404)
  }
  if (!upstream.ok || body.error) {
    throw new UpstreamError(body.error?.message ?? 'Deezer indisponible', 502)
  }
  return body
}

async function playlistTracks(id: number): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = []
  for (let index = 0; index < MAX_PER_PLAYLIST; index += PAGE) {
    const body = await deezer<{ data?: DeezerTrack[] }>(
      `playlist/${id}/tracks?limit=${PAGE}&index=${index}`,
    )
    const page = body.data ?? []
    tracks.push(...page)
    if (page.length < PAGE) break
  }
  return tracks
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  // ?playlist=<id> accepte n'importe quelle playlist Deezer publique ; ?source= les tops prédéfinis.
  const playlist = params.get('playlist')
  const ids = playlist ? [Number(playlist)] : SOURCES[params.get('source') ?? '']
  if (!ids || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    return Response.json({ error: 'Source inconnue' }, { status: 400 })
  }

  let title: string | undefined
  let pages: DeezerTrack[][]
  try {
    // Le titre ne sert que pour une playlist choisie par l'animateur, pas pour les tops.
    const [meta, ...rest] = await Promise.all([
      playlist ? deezer<{ title: string }>(`playlist/${ids[0]}`) : Promise.resolve(undefined),
      ...ids.map(playlistTracks),
    ])
    title = meta?.title
    pages = rest as DeezerTrack[][]
  } catch (e) {
    const status = e instanceof UpstreamError ? e.status : 502
    return Response.json({ error: (e as Error).message }, { status })
  }

  const seen = new Set<number>()
  const results = pages.flat().flatMap((t) => {
    if (!t.preview || seen.has(t.id)) return []
    seen.add(t.id)
    return [
      {
        id: t.id,
        title: t.title,
        artist: t.artist.name,
        album: t.album.title,
        cover: t.album.cover_medium,
      },
    ]
  })

  return Response.json(
    { title, results },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
  )
}
