// Proxy de recherche Deezer : l'API publique n'envoie pas d'en-têtes CORS.
type DeezerTrack = {
  id: number
  title: string
  duration: number
  preview: string
  artist: { name: string }
  album: { title: string; cover_medium: string }
}

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return Response.json({ results: [] })

  const upstream = await fetch(
    `https://api.deezer.com/search?limit=25&q=${encodeURIComponent(q)}`,
  )
  const body = (await upstream.json()) as { data?: DeezerTrack[]; error?: { message: string } }
  if (!upstream.ok || body.error) {
    return Response.json({ error: body.error?.message ?? 'Deezer indisponible' }, { status: 502 })
  }

  const results = (body.data ?? [])
    .filter((t) => t.preview)
    .map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist.name,
      album: t.album.title,
      cover: t.album.cover_medium,
    }))

  return Response.json(
    { results },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
  )
}
