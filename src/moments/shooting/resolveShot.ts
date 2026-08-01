import { SeededRng } from '../../core/rng/SeededRng'
import { clampUnit, DEFAULT_SHOT_WEIGHTS, normalizeShotWeights } from './config'
import { normalizeShotInput } from './normalizeShotInput'
import type {
  GoalkeeperDecision,
  NormalizedPoint,
  ResolveShotRequest,
  ShotResolution,
} from './types'

const clampPoint = (point: NormalizedPoint): NormalizedPoint => ({
  x: clampUnit(point.x),
  y: clampUnit(point.y),
})
const pointDistance = (a: NormalizedPoint, b: NormalizedPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const resolveShot = (request: ResolveShotRequest): ShotResolution => {
  const input = normalizeShotInput(request.input)
  const weights = normalizeShotWeights(request.weights ?? DEFAULT_SHOT_WEIGHTS)
  const { scenario, player } = request
  validatePlayer(player)
  validateContext(scenario.context)
  const namespace = `${request.simulationVersion}:${request.seed}:${scenario.id}`
  const rng = new SeededRng(namespace)
  const targetPosition = clampPoint({
    x: 0.5 + input.normalizedDirectionX * 0.43,
    y: 0.67 + input.normalizedDirectionY * 0.55,
  })
  const directionMagnitude = Math.hypot(
    input.normalizedDirectionX,
    input.normalizedDirectionY,
  )
  const directionalControl = clampUnit(
    1 - Math.abs(directionMagnitude - 0.85) * 0.55,
  )
  const powerControl = clampUnit(
    1 - Math.abs(input.normalizedPower - 0.66) * 1.45,
  )
  const timingControl = clampUnit(
    1 - Math.abs(input.releaseTiming - 0.52) * 1.1,
  )
  const humanExecutionScore = clampUnit(
    directionalControl * 0.38 + powerControl * 0.37 + timingControl * 0.25,
  )
  const weakFootFactor =
    player.preferredFoot === player.usedFoot ? 1 : 1 - player.weakFootPenalty
  const playerAbilityScore = clampUnit(
    (player.shooting / 100) * 0.72 * weakFootFactor +
      (player.pressureHandling / 100) * 0.28,
  )
  const contextPenalty =
    scenario.context.fatigue * 0.29 +
    scenario.context.pressure * 0.18 +
    scenario.context.angleDifficulty * 0.25 +
    scenario.context.distance * 0.12 +
    scenario.context.matchImportance * 0.08
  const contextScore = clampUnit(1 - contextPenalty)
  const finalShotQuality = clampUnit(
    humanExecutionScore * weights.humanExecution +
      playerAbilityScore * weights.playerAbility +
      contextScore * weights.context,
  )
  const variation = rng.fork('outcome-variation').nextFloat() - 0.5
  const errorMagnitude =
    (1 - finalShotQuality) * 0.3 + Math.abs(input.normalizedPower - 0.66) * 0.14
  const actualBallDestination = clampPoint({
    x: targetPosition.x + variation * errorMagnitude * 1.8,
    y:
      targetPosition.y +
      (rng.fork('shooting').nextFloat() - 0.5) * errorMagnitude * 1.35,
  })
  const defendersRoll = rng.fork('defenders').nextFloat()
  const blockThreshold =
    scenario.context.defenderCount * (0.12 + (1 - finalShotQuality) * 0.22)
  const goalkeeperDecision = resolveGoalkeeper(
    rng,
    targetPosition,
    actualBallDestination,
    finalShotQuality,
    scenario.context.goalkeeperCoversNearPost,
  )
  const isOffTarget =
    actualBallDestination.x < 0.11 ||
    actualBallDestination.x > 0.89 ||
    actualBallDestination.y < 0.07 ||
    actualBallDestination.y > 0.83
  const postDistance = Math.min(
    Math.abs(actualBallDestination.x - 0.12),
    Math.abs(actualBallDestination.x - 0.88),
  )
  const hitsPost =
    !isOffTarget &&
    postDistance < 0.035 &&
    actualBallDestination.y < 0.77 &&
    rng.fork('outcome-variation').nextFloat() < 0.52
  const outcome = isOffTarget
    ? 'off-target'
    : defendersRoll < blockThreshold
      ? 'blocked'
      : hitsPost
        ? 'post'
        : goalkeeperDecision.reachesBall
          ? 'saved'
          : 'goal'
  return {
    outcome,
    humanExecutionScore,
    playerAbilityScore,
    contextScore,
    finalShotQuality,
    targetPosition,
    actualBallDestination,
    goalkeeperDecision,
    consequenceHint: consequenceFor(outcome, scenario.context.matchImportance),
    explanation: explain({
      input,
      player,
      scenario,
      humanExecutionScore,
      goalkeeperDecision,
      outcome,
    }),
  }
}

const resolveGoalkeeper = (
  rng: SeededRng,
  target: NormalizedPoint,
  actual: NormalizedPoint,
  quality: number,
  coversNearPost: boolean,
): GoalkeeperDecision => {
  const roll = rng.fork('goalkeeper').nextFloat()
  const diveDirection = roll < 0.12 ? 'stay' : target.x < 0.5 ? 'left' : 'right'
  const anticipationScore = clampUnit(
    0.32 + roll * 0.35 + (coversNearPost && target.x < 0.38 ? 0.2 : 0),
  )
  const diveCenterX =
    diveDirection === 'left' ? 0.28 : diveDirection === 'right' ? 0.72 : 0.5
  const reach = 0.2 + anticipationScore * 0.18 - quality * 0.1
  return {
    diveDirection,
    anticipationScore,
    reachesBall: pointDistance(actual, { x: diveCenterX, y: 0.43 }) < reach,
  }
}
const consequenceFor = (
  outcome: ShotResolution['outcome'],
  importance: number,
): ShotResolution['consequenceHint'] => {
  if (outcome === 'goal')
    return importance > 0.8 ? 'major-positive' : 'minor-positive'
  if (outcome === 'off-target' && importance > 0.8) return 'major-negative'
  return outcome === 'saved' || outcome === 'blocked' || outcome === 'post'
    ? 'minor-negative'
    : 'neutral'
}
const explain = ({
  input,
  player,
  scenario,
  humanExecutionScore,
  goalkeeperDecision,
  outcome,
}: {
  input: ResolveShotRequest['input']
  player: ResolveShotRequest['player']
  scenario: ResolveShotRequest['scenario']
  humanExecutionScore: number
  goalkeeperDecision: GoalkeeperDecision
  outcome: ShotResolution['outcome']
}): readonly string[] => {
  const messages: string[] = []
  if (Math.abs(input.normalizedPower - 0.66) > 0.25)
    messages.push(
      input.normalizedPower > 0.66
        ? 'Geste trop puissant.'
        : 'Puissance insuffisante.',
    )
  if (scenario.context.angleDifficulty > 0.6) messages.push('Angle difficile.')
  if (scenario.context.fatigue > 0.7) messages.push('Fatigue importante.')
  if (player.preferredFoot !== player.usedFoot)
    messages.push('Tir réalisé du pied faible.')
  if (player.shooting >= 80) messages.push('Excellente finition.')
  if (humanExecutionScore >= 0.8) messages.push('Geste bien maîtrisé.')
  if (outcome === 'blocked') messages.push('Défenseur sur la trajectoire.')
  if (outcome === 'post') messages.push('Le poteau repousse la frappe.')
  if (outcome === 'off-target') messages.push('La frappe sort du cadre.')
  if (outcome === 'saved' && goalkeeperDecision.reachesBall)
    messages.push('Gardien ayant correctement anticipé.')
  if (outcome === 'goal') messages.push('Le gardien ne peut pas intervenir.')
  return messages
}
const validatePlayer = (player: ResolveShotRequest['player']): void => {
  for (const value of [player.shooting, player.pressureHandling])
    if (!Number.isFinite(value) || value < 0 || value > 100)
      throw new RangeError('Player ratings must be between 0 and 100.')
  if (
    !Number.isFinite(player.weakFootPenalty) ||
    player.weakFootPenalty < 0 ||
    player.weakFootPenalty > 1
  )
    throw new RangeError('Weak-foot penalty must be between 0 and 1.')
}
const validateContext = (
  context: ResolveShotRequest['scenario']['context'],
): void => {
  for (const value of [
    context.fatigue,
    context.pressure,
    context.angleDifficulty,
    context.distance,
    context.matchImportance,
  ])
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError('Shot context values must be between 0 and 1.')
  if (!Number.isInteger(context.defenderCount) || context.defenderCount < 0)
    throw new RangeError('Defender count must be a non-negative integer.')
}
