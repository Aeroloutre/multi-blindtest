// Deezer sépare parfois le featuring dans `title_version` (ex. "(feat. X)"), mais ce champ
// contient aussi d'autres mentions ("Acoustic Version", "Radio Edit"...) qu'on ne veut pas afficher.
export function parseFeat(titleVersion: string | undefined): string | undefined {
  const match = titleVersion?.match(/(?:feat\.?|ft\.?|featuring)\s+(.+)/i)
  return match ? `feat. ${match[1].replace(/\)+\s*$/, '').trim()}` : undefined
}
