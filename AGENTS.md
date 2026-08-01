# Moments — règles du projet

## Exécution locale

Moments fonctionne intégralement dans le navigateur : pas de backend obligatoire, de base distante, de compte utilisateur ni d'API nécessaire pour jouer. Les données statiques sont embarquées ; les sauvegardes iront dans IndexedDB et les préférences légères dans localStorage. L'export et l'import seront possibles ultérieurement.

## Déterminisme

Le monde utilise une seed. À seed, version, décisions et résultats identiques, la simulation doit produire le même résultat. `Math.random()` est interdit dans la logique du jeu, de même que les identifiants aléatoires non déterministes et la dépendance au temps système dans une simulation (sauf valeur explicitement injectée).

## Moteur et interface

La simulation est indépendante de React. Les modules du moteur ne doivent importer ni React, ni composants, ni DOM, ni stockage navigateur. L'interface appelle le moteur ; le moteur ne connaît jamais l'interface.

## Monde vivant et identité

Les autres joueurs vivent et évoluent indépendamment du personnage contrôlé. À terme, chacun possède une identité stable, nationalité, âge, postes, pied fort, attributs, traits cachés, courbe de progression, club, contrat, carrière, blessures, récompenses, relations pertinentes et valeur marchande.

L'utilisateur ne saisit jamais prénom ou nom : il choisit nationalité, poste, pied fort et réponses d'archétype ; les noms sont générés, y compris pour les autres joueurs.

## Carrières et gameplay

Les courbes de carrière sont des tendances, jamais des destins figés : régulière, prodige, explosion tardive, exponentielle, pic bref, déclin précoce, éternel espoir, stable, renaissance, chaotique, longévité ou effondrement. La carrière entière est simulée, mais les Moments jouables — frappe, passe, penalty, coup franc, dribble, duel, centre, tête, gardien — peuvent changer le destin. Adresse humaine, attributs et contexte influencent le résultat.

## Événements et économie

Le moteur acceptera des événements communs ou rares, sportifs, financiers, relationnels, médiatiques et extrêmes, avec conséquences différées, témoins, preuves et enquêtes. Les événements extrêmes restent rares. Distinguer niveau, réputation, valeur, prix de transfert, salaire, patrimoine, richesse, budgets, prestige et attractivité. Un recrutement dépendra aussi des besoins, masse salariale, rôle, concurrence et ambitions. Les championnats européens majeurs gardent une forte hiérarchie et le prestige historique a une inertie importante.

## Récompenses, noms et propriété intellectuelle

Les futures récompenses (Ballon d'Or, Soulier d'Or, Yachine, jeunes, nationales et équipes de saison) ne reposent jamais uniquement sur la note générale. Le futur système de noms respecte la nationalité, normalise accents/espaces/tirets/particules, évite collisions et identités/surnoms de joueurs connus, et traite les noms brésiliens spécifiquement. N'ajouter aucun logo, maillot, photo, blason ni ressource propriétaire réelle.
