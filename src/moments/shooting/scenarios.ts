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
    description:
      'Ballon dans l’axe, gardien centré, aucune opposition directe.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.2,
      pressure: 0.42,
      angleDifficulty: 0.15,
      distance: 0.25,
      matchImportance: 0.45,
      goalkeeperCoversNearPost: false,
    },
    geometry: {
      ballStart: { x: 0.5, y: 0.86 },
      goalkeeperStart: { x: 0.5, y: 0.29 },
      defenderPositions: [],
    },
    targetGuide: { x: 0.72, y: 0.27 },
  },
  {
    id: 'tight-angle',
    label: 'B — Angle fermé',
    description:
      'Ballon décalé à droite, premier poteau gardé et angle réellement réduit.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.28,
      pressure: 0.58,
      angleDifficulty: 0.72,
      distance: 0.53,
      matchImportance: 0.5,
      goalkeeperCoversNearPost: true,
    },
    geometry: {
      ballStart: { x: 0.78, y: 0.82 },
      goalkeeperStart: { x: 0.68, y: 0.29 },
      defenderPositions: [],
    },
    targetGuide: { x: 0.38, y: 0.27 },
  },
  {
    id: 'defender-contact',
    label: 'C — Défenseur au contact',
    description: 'Un défenseur coupe une partie des trajectoires vers le but.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.38,
      pressure: 0.78,
      angleDifficulty: 0.35,
      distance: 0.34,
      matchImportance: 0.6,
      goalkeeperCoversNearPost: false,
    },
    geometry: {
      ballStart: { x: 0.45, y: 0.84 },
      goalkeeperStart: { x: 0.5, y: 0.29 },
      defenderPositions: [{ x: 0.52, y: 0.57 }],
    },
    targetGuide: { x: 0.74, y: 0.3 },
  },
  {
    id: 'decisive-fatigue',
    label: 'D — Action décisive sous fatigue',
    description:
      'Même géométrie qu’un face-à-face, difficulté due à la fatigue et à l’enjeu.',
    defaultPlayer: standardPlayer,
    context: {
      fatigue: 0.83,
      pressure: 1,
      angleDifficulty: 0.15,
      distance: 0.25,
      matchImportance: 1,
      goalkeeperCoversNearPost: false,
    },
    geometry: {
      ballStart: { x: 0.5, y: 0.86 },
      goalkeeperStart: { x: 0.5, y: 0.29 },
      defenderPositions: [],
    },
    targetGuide: { x: 0.72, y: 0.27 },
  },
]
export const getShotScenario = (id: string): ShotScenario => {
  const scenario = SHOT_SCENARIOS.find((item) => item.id === id)
  if (!scenario) throw new RangeError(`Unknown shot scenario: ${id}`)
  return scenario
}
