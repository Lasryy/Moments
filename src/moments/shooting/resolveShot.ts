import { SeededRng } from '../../core/rng/SeededRng'
import { clampUnit, DEFAULT_SHOT_WEIGHTS, normalizeShotWeights } from './config'
import { normalizeShotInput } from './normalizeShotInput'
import type {
  GoalkeeperDecision,
  NormalizedPoint,
  ResolveShotRequest,
  ShotResolution,
} from './types'

const GOAL = { left: 0.11, right: 0.89, top: 0.07, bottom: 0.83 }
const clampPoint = (
  point: NormalizedPoint,
  minimum = 0,
  maximum = 1,
): NormalizedPoint => ({
  x: Math.min(maximum, Math.max(minimum, point.x)),
  y: Math.min(maximum, Math.max(minimum, point.y)),
})
const distance = (a: NormalizedPoint, b: NormalizedPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y)
const lerpPoint = (
  from: NormalizedPoint,
  to: NormalizedPoint,
  progress: number,
): NormalizedPoint => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress,
})

export const resolveShot = (request: ResolveShotRequest): ShotResolution => {
  const input = normalizeShotInput(request.input)
  const weights = normalizeShotWeights(request.weights ?? DEFAULT_SHOT_WEIGHTS)
  const { scenario, player } = request
  validatePlayer(player)
  validateContext(scenario.context)
  const rng = new SeededRng(
    `${request.simulationVersion}:${request.seed}:${scenario.id}`,
  )
  const { ballStart } = scenario.geometry
  const targetPosition = clampPoint({
    x: ballStart.x + input.normalizedDirectionX * 0.5,
    y: ballStart.y + input.normalizedDirectionY * 0.9,
  })
  const humanExecutionScore = calculateHumanScore(input)
  const playerAbilityScore = calculatePlayerScore(player)
  const contextScore = calculateContextScore(scenario)
  const finalShotQuality = clampUnit(
    humanExecutionScore * weights.humanExecution +
      playerAbilityScore * weights.playerAbility +
      contextScore * weights.context,
  )
  const errorMagnitude =
    (1 - finalShotQuality) * 0.34 +
    Math.abs(input.normalizedPower - 0.66) * 0.15
  const actualBallDestination = clampPoint(
    {
      x:
        targetPosition.x +
        (rng.fork('destination-horizontal').nextFloat() - 0.5) *
          errorMagnitude *
          2.15,
      y:
        targetPosition.y +
        (rng.fork('destination-vertical').nextFloat() - 0.5) *
          errorMagnitude *
          1.7,
    },
    -0.15,
    1.15,
  )
  const isOffTarget =
    actualBallDestination.x < GOAL.left ||
    actualBallDestination.x > GOAL.right ||
    actualBallDestination.y < GOAL.top ||
    actualBallDestination.y > GOAL.bottom
  const defenderBlockPoint = isOffTarget
    ? null
    : resolveDefenderBlock(
        rng,
        scenario,
        actualBallDestination,
        finalShotQuality,
      )
  const hitsPost =
    !isOffTarget &&
    defenderBlockPoint === null &&
    hitsGoalPost(rng, actualBallDestination, finalShotQuality)
  const goalkeeperDecision =
    isOffTarget || defenderBlockPoint || hitsPost
      ? noInterception(scenario.geometry.goalkeeperStart)
      : resolveGoalkeeper(
          rng,
          scenario,
          actualBallDestination,
          finalShotQuality,
        )
  const outcome = isOffTarget
    ? 'off-target'
    : defenderBlockPoint
      ? 'blocked'
      : hitsPost
        ? 'post'
        : goalkeeperDecision.reachesBall
          ? 'saved'
          : 'goal'
  const postBounceDestination =
    outcome === 'post'
      ? {
          x:
            actualBallDestination.x < 0.5
              ? actualBallDestination.x + 0.09
              : actualBallDestination.x - 0.09,
          y: actualBallDestination.y + 0.12,
        }
      : null
  return {
    outcome,
    humanExecutionScore,
    playerAbilityScore,
    contextScore,
    finalShotQuality,
    targetPosition,
    actualBallDestination,
    goalkeeperDecision,
    defenderBlockPoint,
    postBounceDestination,
    consequenceHint: consequenceFor(outcome, scenario.context.matchImportance),
    explanation: explain(
      input,
      player,
      scenario,
      humanExecutionScore,
      goalkeeperDecision,
      outcome,
    ),
  }
}

const calculateHumanScore = (input: ResolveShotRequest['input']): number => {
  const direction = Math.hypot(
    input.normalizedDirectionX,
    input.normalizedDirectionY,
  )
  const directionControl = clampUnit(1 - Math.abs(direction - 0.88) * 0.75)
  const powerControl = clampUnit(
    1 - Math.abs(input.normalizedPower - 0.66) * 1.55,
  )
  const timingControl = clampUnit(
    1 - Math.abs(input.releaseTiming - 0.58) * 1.25,
  )
  return clampUnit(
    directionControl * 0.36 + powerControl * 0.38 + timingControl * 0.26,
  )
}
const calculatePlayerScore = (player: ResolveShotRequest['player']): number => {
  const footFactor =
    player.preferredFoot === player.usedFoot ? 1 : 1 - player.weakFootPenalty
  return clampUnit(
    (player.shooting / 100) * 0.78 * footFactor +
      (player.pressureHandling / 100) * 0.22,
  )
}
export const calculateContextScore = (
  scenario: ResolveShotRequest['scenario'],
): number =>
  clampUnit(
    1 -
      (scenario.context.fatigue * 0.3 +
        scenario.context.pressure * 0.18 +
        scenario.context.angleDifficulty * 0.27 +
        scenario.context.distance * 0.14 +
        scenario.context.matchImportance * 0.11),
  )
const resolveDefenderBlock = (
  rng: SeededRng,
  scenario: ResolveShotRequest['scenario'],
  destination: NormalizedPoint,
  quality: number,
): NormalizedPoint | null => {
  const closest = scenario.geometry.defenderPositions
    .map((position) => ({
      position,
      proximity: distanceToSegment(
        position,
        scenario.geometry.ballStart,
        destination,
      ),
    }))
    .sort((a, b) => a.proximity - b.proximity)[0]
  if (!closest) return null
  const chance = clampUnit(
    (0.16 + (1 - quality) * 0.34) * clampUnit(1 - closest.proximity / 0.2),
  )
  return rng.fork('defender-block').chance(chance) ? closest.position : null
}
const distanceToSegment = (
  point: NormalizedPoint,
  start: NormalizedPoint,
  end: NormalizedPoint,
): number => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return distance(point, start)
  const progress = clampUnit(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
  )
  return distance(point, lerpPoint(start, end, progress))
}
const hitsGoalPost = (
  rng: SeededRng,
  destination: NormalizedPoint,
  quality: number,
): boolean => {
  const proximity = Math.min(
    Math.abs(destination.x - GOAL.left),
    Math.abs(destination.x - GOAL.right),
  )
  return (
    proximity < 0.032 &&
    rng.fork('post-collision').chance(clampUnit(0.62 - quality * 0.2))
  )
}
const resolveGoalkeeper = (
  rng: SeededRng,
  scenario: ResolveShotRequest['scenario'],
  destination: NormalizedPoint,
  quality: number,
): GoalkeeperDecision => {
  const startPosition = scenario.geometry.goalkeeperStart
  const intendedDirection =
    destination.x < startPosition.x - 0.035
      ? 'left'
      : destination.x > startPosition.x + 0.035
        ? 'right'
        : 'stay'
  const nearPostSide =
    scenario.geometry.ballStart.x < 0.5
      ? 'left'
      : scenario.geometry.ballStart.x > 0.5
        ? 'right'
        : null
  const readingSkill =
    0.42 +
    (scenario.context.goalkeeperCoversNearPost &&
    nearPostSide === intendedDirection
      ? 0.18
      : 0)
  const readWasCorrect = rng.fork('goalkeeper-reading').chance(readingSkill)
  const wrongChoice = rng.fork('goalkeeper-direction').nextFloat()
  const diveDirection = readWasCorrect
    ? intendedDirection
    : wrongChoice < 0.62
      ? intendedDirection === 'left'
        ? 'right'
        : 'left'
      : 'stay'
  const reactionScore = clampUnit(
    0.32 + rng.fork('goalkeeper-reaction').nextFloat() * 0.5 - quality * 0.14,
  )
  const reachScore = clampUnit(
    0.18 +
      rng.fork('goalkeeper-reach').nextFloat() * 0.4 +
      (scenario.context.goalkeeperCoversNearPost &&
      nearPostSide === diveDirection
        ? 0.14
        : 0) -
      quality * 0.12,
  )
  const diveTarget = {
    x:
      diveDirection === 'left'
        ? 0.23
        : diveDirection === 'right'
          ? 0.77
          : startPosition.x,
    y: 0.42,
  }
  const interceptionPoint = lerpPoint(
    scenario.geometry.ballStart,
    destination,
    0.68,
  )
  const reachesBall =
    diveDirection === intendedDirection &&
    distance(interceptionPoint, diveTarget) < reachScore + reactionScore * 0.16
  return {
    startPosition,
    diveDirection,
    readWasCorrect,
    reactionScore,
    reachScore,
    interceptionPoint: reachesBall ? interceptionPoint : null,
    reachesBall,
  }
}
const noInterception = (
  startPosition: NormalizedPoint,
): GoalkeeperDecision => ({
  startPosition,
  diveDirection: 'stay',
  readWasCorrect: false,
  reactionScore: 0,
  reachScore: 0,
  interceptionPoint: null,
  reachesBall: false,
})
const consequenceFor = (
  outcome: ShotResolution['outcome'],
  importance: number,
): ShotResolution['consequenceHint'] =>
  outcome === 'goal'
    ? importance > 0.8
      ? 'major-positive'
      : 'minor-positive'
    : outcome === 'off-target' && importance > 0.8
      ? 'major-negative'
      : outcome === 'saved' || outcome === 'blocked' || outcome === 'post'
        ? 'minor-negative'
        : 'neutral'
const explain = (
  input: ResolveShotRequest['input'],
  player: ResolveShotRequest['player'],
  scenario: ResolveShotRequest['scenario'],
  humanScore: number,
  goalkeeper: GoalkeeperDecision,
  outcome: ShotResolution['outcome'],
): readonly string[] => {
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
  if (humanScore >= 0.82) messages.push('Geste bien maîtrisé.')
  if (outcome === 'blocked') messages.push('Défenseur sur la trajectoire.')
  if (outcome === 'post') messages.push('Le poteau repousse la frappe.')
  if (outcome === 'off-target') messages.push('La frappe sort du cadre.')
  if (outcome === 'saved')
    messages.push(
      goalkeeper.readWasCorrect
        ? 'Gardien ayant correctement lu la frappe.'
        : 'Le gardien atteint le ballon tardivement.',
    )
  if (outcome === 'goal' && !goalkeeper.readWasCorrect)
    messages.push('Gardien parti du mauvais côté.')
  if (outcome === 'goal' && goalkeeper.readWasCorrect)
    messages.push('Bonne lecture, portée insuffisante.')
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
}
