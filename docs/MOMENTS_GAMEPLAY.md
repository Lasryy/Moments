# Gameplay des Moments

## Laboratoire de frappe v3

`/dev/minigames` reste un laboratoire Canvas 2D sans carrière. Sa résolution est désormais **`shooting-v3`** ; les reproductions de développement `shooting-v1` et `shooting-v2` ne sont pas garanties, car aucune sauvegarde publique n’existe encore.

La scène utilise une vue frontale unique derrière le tireur. Les acteurs restent des pions abstraits : tireur bleu, gardien orange, défenseur gris et ballon blanc. Le choix vise la lisibilité du playtest, et non le style définitif du jeu.

## Géométrie et classification

Le moteur et le Canvas partagent la même géométrie normalisée. La bouche du but est le rectangle `left: 0.20`, `right: 0.80`, `top: 0.12`, `bottom: 0.50`, avec poteaux et barre ayant un rayon simplifié. Le rendu montre une cage rectangulaire, son filet et son cadre ; il ne dessine ni surface de réparation ni arc de terrain.

Une destination extérieure à cette bouche est obligatoirement `off-target`. Un `goal` ou un `saved` est donc impossible hors cadre. Les poteaux et la barre sont détectés par collision géométrique entre la trajectoire et le cadre, avant le gardien. Les défenseurs ne sont évalués que pour une frappe cadrée qui n’a pas touché le cadre.

L’angle fermé emploie la même cage : le ballon est réellement à droite de l’écran et le premier poteau est donc le vrai poteau droit. Le label `1er POTEAU` est une aide debug seulement.

## Entrées, résolution et gardien

Le pointeur presse le ballon, glisse, puis relâche. La direction, la longueur et la durée sont normalisées en `ShotInput`; un geste trop court et `pointercancel` annulent sans tirer. Au clavier, les flèches rendent la cible visible, Espace charge la puissance et relâcher Espace capture le timing.

Les poids restent provisoirement 55 % exécution humaine, 30 % capacités et 15 % contexte. L’exécution combine direction, puissance et timing ; le profil utilise tir, gestion de pression et pied ; le contexte utilise fatigue, pression, angle, distance et enjeu.

Le gardien possède positionnement, lecture, réflexes et portée. Sa résolution distingue lecture, éventuel mauvais premier appui, réaction, distance de déplacement disponible et point d’interception. Une mauvaise lecture mène généralement à un léger appui erroné, du retard ou une portée insuffisante ; un engagement complet au côté opposé est intentionnellement rare en jeu ouvert. Les directions de diagnostic sont toujours « gauche écran », « droite écran » ou « reste au centre ».

## Playback et aides

Visée, résultat et playback sont séparés. À l’ouverture, aucun tir n’est calculé. Une nouvelle visée remet proprement la scène à l’état initial ; elle ne laisse ni ancienne trajectoire ni ancien résultat visible. Le relâchement résout une seule fois. « Rejouer exactement » réutilise strictement le même `ShotResolution`, remet son playhead à zéro et ne rappelle pas le moteur. Modifier une aide debug ou redimensionner la scène ne redémarre pas le replay.

L’animation est dérivée du résultat déjà calculé : le ballon entre dans le filet, s’arrête à l’interception, atteint le défenseur, rebondit sur le cadre ou sort distinctement hors de la cage. Le gardien suit son déplacement continu depuis sa position initiale, éventuellement via un mauvais premier appui. `prefers-reduced-motion` raccourcit l’animation.

Les aides activées par défaut affichent trajectoire du ballon, déplacement du gardien, interception, bloc et zone visée. La cible est verte dans la cage et orange hors cadre.

## Calibration et limites

`npm run simulate:shots` exécute 10 000 frappes déterministes et une matrice gestes mauvais/moyen/bon/excellent × tir 48/70/88 × scénarios. Il rapporte tirs cadrés, issues, cadre touché, lectures, mauvais appuis, engagements opposés et portée insuffisante, avec une assertion empêchant un but ou arrêt hors cage.

L’équilibre final, la caméra, le rendu visuel, les aides en production, les seuils du gardien et des défenseurs, la part définitive de l’adresse humaine et le nombre de Moments restent ouverts après playtest manuel.
