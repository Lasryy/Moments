# Architecture technique

L'interface React appelle un moteur TypeScript indépendant. Le moteur est organisé autour de `core`, `world`, `career`, `events`, `moments` et `naming` ; il n'importe ni React, ni DOM, ni stockage navigateur. Un `SeededRng` et des forks nommés rendent les sous-systèmes déterministes.

Les sauvegardes versionnées sont validées avec Zod aux frontières de sérialisation et seront conservées dans IndexedDB. Les préférences légères relèveront de localStorage. Des migrations de schéma préserveront les sauvegardes lors de l'évolution des données. L'application est statique, sans backend.

Les tests unitaires couvrent aujourd'hui le RNG et la sérialisation minimale. Les prochaines phases ajouteront des batteries massives de simulations déterministes, des tests de migration et des tests de performance. Un Web Worker isolera les avances de monde longues de l'interface.
