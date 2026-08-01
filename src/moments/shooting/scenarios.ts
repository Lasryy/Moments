import type { ShotScenario } from './types'
const standardPlayer = {
  shooting: 72,
  pressureHandling: 68,
  preferredFoot: 'right',
  usedFoot: 'right',
  weakFootPenalty: 0.16,
} as const
export const SHOT_SCENARIOS: readonly ShotScenario[] = [
  {
    id: 'central-one-on-one',
    label: 'A — Face-à-face central',
    description: 'Bonne position, pression modérée, gardien seul.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.2,
      pressure: 0.42,
      angleDifficulty: 0.15,
      distance: 0.25,
      defenderCount: 0,
      matchImportance: 0.45,
      goalkeeperCoversNearPost: false,
    },
    targetGuide: { x: 0.7, y: 0.35 },
  },
  {
    id: 'tight-angle',
    label: 'B — Angle fermé',
    description: 'Distance moyenne et premier poteau couvert.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.28,
      pressure: 0.58,
      angleDifficulty: 0.72,
      distance: 0.53,
      defenderCount: 0,
      matchImportance: 0.5,
      goalkeeperCoversNearPost: true,
    },
    targetGuide: { x: 0.24, y: 0.32 },
  },
  {
    id: 'defender-contact',
    label: 'C — Défenseur au contact',
    description: 'Peu de temps et risque de bloc.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.38,
      pressure: 0.78,
      angleDifficulty: 0.35,
      distance: 0.34,
      defenderCount: 1,
      matchImportance: 0.6,
      goalkeeperCoversNearPost: false,
    },
    targetGuide: { x: 0.72, y: 0.3 },
  },
  {
    id: 'decisive-fatigue',
    label: 'D — Action décisive sous fatigue',
    description: 'Fin de match, fatigue et pression maximales.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.83,
      pressure: 1,
      angleDifficulty: 0.3,
      distance: 0.38,
      defenderCount: 0,
      matchImportance: 1,
      goalkeeperCoversNearPost: false,
    },
    targetGuide: { x: 0.72, y: 0.25 },
  },
]
export const getShotScenario = (id: string): ShotScenario => {
  const scenario = SHOT_SCENARIOS.find((item) => item.id === id)
  if (!scenario) throw new RangeError(`Unknown shot scenario: ${id}`)
  return scenario
}
