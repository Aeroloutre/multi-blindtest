# multi-blindtest

Blind test où 5 morceaux jouent en même temps. L'animateur coupe chaque morceau trouvé, jusqu'au dernier.

PWA (Vite + React + shadcn/ui) installable sur iPhone. Les extraits de 30 s viennent de l'API publique Deezer et sont stockés sur l'appareil (IndexedDB) : une fois ajoutés, ils se jouent hors-ligne.

## Fonctionnement

- **Bibliothèque** : recherche Deezer, ajout d'un morceau (téléchargement de l'extrait + mesure de sa sonie EBU R128).
- **Manches** : 5 morceaux, point de départ réglable dans l'extrait, bouton « Compléter au hasard » (puise dans la bibliothèque).
- **Tirage dans les tops** : dans le sélecteur de morceau, « Top France » / « Top Monde » tirent un titre au hasard dans les charts Deezer et l'ajoutent à la bibliothèque.
- **Manche depuis une playlist** : chercher une playlist Deezer par son nom (ou coller son lien), puis « Générer la manche » tire les 5 titres, **au plus un par artiste**. La playlist reste attachée à la manche : « Relancer la manche » retire 5 autres titres.
- **Un titre = une manche** : un morceau déjà utilisé ailleurs apparaît grisé. Supprimer une manche propose de supprimer ses morceaux devenus inutilisés.
- **Lecteur** : lecture / pause / stop globaux, isoler (solo) et couper (mute) par piste, volume par piste mémorisé dans la manche. Les extraits bouclent.

Le volume est égalisé automatiquement (cible −16 LUFS par piste) ; le curseur ajuste ensuite à la main..

## Développement

```bash
npm install
npm run dev      # http://localhost:5173, les routes /api sont servies par Vite
npm run build
```

`api/search.ts`, `api/preview.ts` et `api/charts.ts` sont des fonctions Vercel : l'API Deezer n'autorise pas les appels directs depuis un navigateur (CORS).

`api/charts.ts` agrège des playlists Deezer : Deezer n'expose pas de « top 300 » par pays, ses charts officielles sont des playlists de 100 titres, qu'on cumule (`SOURCES` dans le fichier). `?playlist=<id>` accepte n'importe quelle playlist publique (jusqu'à 300 titres, paginés par 100).

`api/search.ts?type=playlist` cherche les playlists publiques par leur nom (celles de moins de 5 titres sont écartées : elles ne peuvent pas remplir une manche).

Les liens courts `link.deezer.com/s/…` (partage depuis l'app mobile) ne sont pas reconnus : ils demanderaient une résolution de redirection côté serveur. Chercher la playlist par son nom, ou coller l'URL `deezer.com/…/playlist/<id>` du site web.

## Déploiement (Vercel)

1. Pousser le repo sur GitHub.
2. Sur [vercel.com/new](https://vercel.com/new), importer le repo (preset Vite détecté, aucune variable d'environnement).
   Ou en ligne de commande : `npx vercel --prod`.
3. Sur l'iPhone, ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil ».

Chaque push sur `main` redéploie ; la PWA se met à jour à la réouverture.

## Notes iOS

- Lancer l'app depuis l'écran d'accueil : Safari peut purger les données des sites non installés.
- Sur iOS 17+, le son sort même en mode silencieux.
- La recherche et l'ajout de morceaux nécessitent le réseau ; la lecture non.
