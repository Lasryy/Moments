# Simulation du monde

Le monde persistant contient de vrais joueurs simulés, pas de simples figurants. Chaque joueur conserve son identité et son histoire tandis que les saisons passent : âge, forme, club, contrat, blessures, récompenses et relations peuvent évoluer hors champ du joueur contrôlé.

La précision doit être adaptative : détaillée autour du personnage, agrégée pour les joueurs pertinents, statistique pour le reste. Le monde fait vieillir les joueurs, crée de nouveaux jeunes, organise transferts et retraites, et conserve les traces individuelles nécessaires au récit.

Un Web Worker prendra ultérieurement en charge les longues avances de simulation. Pour rester léger dans le navigateur : lots saisonniers, données normalisées et versionnées, détails à la demande, résumés historiques compacts et budgets stricts de joueurs/événements actifs. La simulation reste déterministe et ne dépend pas de l'interface.
