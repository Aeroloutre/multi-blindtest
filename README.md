# multi-blindtest

Blind test où 5 morceaux jouent en même temps. L'animateur coupe chaque morceau trouvé, jusqu'au dernier.

PWA (Vite + React + shadcn/ui) installable sur iPhone. Les extraits de 30 s viennent de l'API publique Deezer et sont stockés sur l'appareil (IndexedDB) : une fois ajoutés, ils se jouent hors-ligne.

## Fonctionnement

- **Bibliothèque** : recherche Deezer, ajout d'un morceau (téléchargement de l'extrait + mesure de sa sonie EBU R128).
- **Manches** : 5 morceaux, point de départ réglable dans l'extrait, bouton « Compléter au hasard ».
- **Lecteur** : lecture / pause / stop globaux, isoler (solo) et couper (mute) par piste, volume par piste mémorisé dans la manche. Les extraits bouclent.

Le volume est égalisé automatiquement (cible −16 LUFS par piste) ; le curseur ajuste ensuite à la main..

## Développement

```bash
npm install
npm run dev      # http://localhost:5173, les routes /api sont servies par Vite
npm run build
```

`api/search.ts` et `api/preview.ts` sont des fonctions Vercel : l'API Deezer n'autorise pas les appels directs depuis un navigateur (CORS).

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
