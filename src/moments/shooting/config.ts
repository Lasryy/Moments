import type { ShotWeights } from './types'
export const DEFAULT_SHOT_WEIGHTS: ShotWeights = {
  humanExecution: 0.55,
  playerAbility: 0.3,
  context: 0.15,
}
/** v1 reproductions are intentionally not preserved: no public career save exists yet. */
export const SHOT_SIMULATION_VERSION = 'shooting-v2'
export const clampUnit = (value: number): number =>
  Math.min(1, Math.max(0, value))
export const normalizeShotWeights = (weights: ShotWeights): ShotWeights => {
  const values = Object.values(weights)
  if (values.some((value) => !Number.isFinite(value) || value < 0))
    throw new RangeError('Shot weights must be finite non-negative numbers.')
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0)
    throw new RangeError('At least one shot weight must be greater than zero.')
  return {
    humanExecution: weights.humanExecution / total,
    playerAbility: weights.playerAbility / total,
    context: weights.context / total,
  }
}
