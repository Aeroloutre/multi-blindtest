// Renvoie l'extrait MP3 de 30 s d'un titre Deezer.
// Les URLs d'extrait expirent : on en redemande une fraîche à chaque appel.
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^\d+$/.test(id)) return new Response('id invalide', { status: 400 })

  const track = (await (await fetch(`https://api.deezer.com/track/${id}`)).json()) as {
    preview?: string
    error?: unknown
  }
  if (track.error || !track.preview) return new Response('Extrait introuvable', { status: 404 })

  const audio = await fetch(track.preview)
  if (!audio.ok) return new Response('Téléchargement impossible', { status: 502 })

  return new Response(await audio.arrayBuffer(), {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 's-maxage=86400' },
  })
}
