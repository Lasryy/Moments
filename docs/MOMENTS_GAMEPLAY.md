# Gameplay des Moments

## Laboratoire de frappe v2

Le laboratoire `/dev/minigames` est un test manuel Canvas 2D, sans carrière. La résolution courante est **`shooting-v2`**. Les reproductions `shooting-v1` ne sont pas garanties durant ce développement : il n’existe encore aucune carrière publique à migrer.

Un scénario possède une géométrie indépendante du Canvas : position de départ du ballon, position initiale du gardien et positions de défenseurs. Ainsi, l’angle fermé est réellement décalé et son gardien couvre le premier poteau ; le défenseur au contact coupe une trajectoire ; l’action sous fatigue reprend la géométrie centrale pour isoler l’effet du contexte.

## Lisibilité du playtest

Le laboratoire emploie volontairement une représentation abstraite de tableau tactique : tireur bleu, gardien orange, défenseur gris et ballon blanc sont des pions circulaires. Ce n’est pas la direction artistique finale ; cette passe privilégie la compréhension instantanée du placement et de l’issue.

Le but, sa surface et le premier poteau à angle fermé sont explicitement dessinés. Avant le tir, la ligne pointillée, une cible projetée, la jauge de puissance et le timing restent visibles directement dans la scène. Après le tir, le résultat est figé et libellé en français.

Les aides visuelles du laboratoire sont activées par défaut et peuvent être masquées individuellement : trajectoire du ballon, déplacement du gardien, interception, bloc et zone visée. Elles permettent de comparer la résolution au rendu sans modifier le moteur.

## Contrôles et états

Le pointeur presse le ballon, glisse, puis relâche. Direction, longueur et durée sont converties en `ShotInput`; un geste trop court est annulé. `pointercancel` annule également sans tirer. Une seule capture active est acceptée.

Au clavier, les flèches affichent immédiatement la cible. Espace charge progressivement la puissance ; un indicateur de timing oscille séparément, puis le relâchement produit le même `ShotInput` que le pointeur. Le moteur ne reçoit jamais de coordonnées Canvas ni de temps système.

L’écran distingue explicitement visée, tir terminé et animation. À l’ouverture, aucun tir n’est résolu. Les réglages, la seed ou le scénario préparent une nouvelle situation. Le relâchement résout une fois, « Rejouer » réanime le même résultat sans recalcul.

## Résolution et gardien

La qualité conserve les poids provisoires : 55 % exécution humaine, 30 % capacités et 15 % contexte. L’exécution combine contrôle de direction, puissance et timing ; les capacités utilisent tir, pression et pied ; le contexte utilise fatigue, pression, angle, distance et enjeu.

Les streams déterministes sont nommés séparément pour les erreurs horizontale/verticale, lecture, direction, réaction et portée du gardien, bloc et poteau. Le gardien ne connaît pas automatiquement le côté visé : il lit l’intention, choisit une direction, réagit et tente d’atteindre le point d’interception depuis sa position initiale. Sa couverture du premier poteau est déterminée dans les deux sens par le côté réel du tireur.

Les issues sont `goal`, `saved`, `blocked`, `post` et `off-target`. Le résultat contient point d’interception, point de bloc et rebond de poteau si nécessaire. L’animation est exclusivement construite à partir de ces données : but dans le filet, arrêt à l’interception, bloc au défenseur, poteau puis rebond, hors cadre au-delà du but. `prefers-reduced-motion` raccourcit l’animation.

Le gardien part toujours de sa position de départ. Sa trace et sa destination rendent visible une lecture correcte, une mauvaise direction ou une portée insuffisante ; lors d’un arrêt, il termine au point d’interception. Cette lisibilité est prioritaire sur tout rendu humanoïde.

## Calibration et limites

`npm run simulate:shots` fournit un balayage aléatoire de 10 000 frappes et une matrice contrôlée (gestes mauvais/moyen/bon/excellent × tir 48/70/88 × scénarios). Elle affiche les issues, qualité, bonnes lectures et mauvais côtés du gardien. Elle sert à observer une hiérarchie, pas à décider de l’équilibre final.

Restent ouverts : style visuel final, caméra, intensité des aides visuelles, niveau de minimalisme, seuils précis du gardien et des blocs, poids finaux, nombre final de Moments, équilibre humain/attributs et sensations tactiles réelles.
