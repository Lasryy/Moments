# Gameplay des Moments

## Prototype de frappe

Le laboratoire `/dev/minigames` teste une vue 2D face au but, légèrement surélevée, rendue avec Canvas 2D natif. Il s'agit d'un choix expérimental : le ballon, le tireur, le gardien, le but, l'éventuel défenseur et la destination sont représentés par des formes simples.

Le geste utilise les Pointer Events. Le joueur presse le ballon, glisse vers la cible, puis relâche : la direction du geste définit la direction, sa longueur la puissance et sa durée normalisée le timing. Le clavier produit exactement le même contrat : les flèches règlent la direction, espace est maintenu puis relâché pour tirer.

```ts
interface ShotInput {
  readonly normalizedDirectionX: number // -1 à 1
  readonly normalizedDirectionY: number // -1 à 1
  readonly normalizedPower: number // 0 à 1
  readonly releaseTiming: number // 0 à 1
}
```

Le moteur valide les bornes et ne reçoit jamais de coordonnées Canvas ou DOM. Les entrées peuvent être sérialisées pour reproduire une frappe.

## Résolution

La qualité finale est une moyenne pondérée normalisée : **55 % exécution humaine**, **30 % capacités**, **15 % contexte**. Ces poids sont des paramètres du laboratoire et ne constituent pas l'équilibre final.

- L'exécution tient compte du contrôle directionnel, de la puissance et du timing.
- Les capacités utilisent provisoirement tir, gestion de la pression, pied fort et pénalité de pied faible.
- Le contexte utilise fatigue, pression, angle, distance, défenseurs et importance du match.

Les issues sont `goal`, `saved`, `blocked`, `post` et `off-target`. Un défenseur applique d'abord un risque de bloc dans les scénarios concernés. Sinon, la destination réelle résulte de la cible et d'une erreur contrôlée ; le gardien choisit une plongée déterministe et peut atteindre le ballon. Les détails intermédiaires et explications courtes sont exposés pour l'équilibrage.

## Déterminisme, rendu et échec

La résolution fork le RNG par sous-système (`shooting`, `goalkeeper`, `defenders`, `outcome-variation`) à partir de la version, seed et scénario. À données identiques, le résultat est identique. L'animation Canvas ne fait qu'interpoler le ballon et les joueurs à partir de ce résultat : la fréquence d'affichage ne peut pas influencer l'issue. `prefers-reduced-motion` réduit l'animation.

Le résultat porte déjà un `SportingConsequenceHint`, sans déclencher de carrière : un but important peut être positif, une occasion très importante manquée peut être négative. L'échec reste donc une donnée de jeu future, pas un simple écran de perte.

## Limites et validations manuelles à venir

Ce prototype ne comporte ni carrière, ni match, ni narration, ni équilibre final. À vérifier après tests manuels : compréhension du geste mobile, lisibilité de la vue 2D, sensation de la puissance, pertinence des explications, équilibre humain/attributs/contexte, réactions du gardien et seuil de bloc. L'ambidextrie n'est pas un pied fort : elle sera éventuellement modélisée plus tard par une qualité de mauvais pied.
