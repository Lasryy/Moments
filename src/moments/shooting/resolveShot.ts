import { SeededRng } from '../../core/rng/SeededRng'
import { clampUnit, DEFAULT_SHOT_WEIGHTS, normalizeShotWeights } from './config'
import {
  clampToGoal,
  classifyShotDestination,
  resolveGoalFrameCollision,
  screenSideForPoint,
} from './geometry'
import { normalizeShotInput } from './normalizeShotInput'
import type {
  GoalkeeperDecision,
  NormalizedPoint,
  ResolveShotRequest,
  ShotResolution,
} from './types'

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
const moveTowards = (
  from: NormalizedPoint,
  to: NormalizedPoint,
  maximum: number,
): NormalizedPoint => {
  const span = distance(from, to)
  return span <= maximum ? to : lerpPoint(from, to, maximum / span)
}

export const resolveShot = (request: ResolveShotRequest): ShotResolution => {
  const input = normalizeShotInput(request.input)
  const weights = normalizeShotWeights(request.weights ?? DEFAULT_SHOT_WEIGHTS)
  const { scenario, player } = request
  validatePlayer(player)
  validateContext(scenario.context)
  const rng = new SeededRng(
    `${request.simulationVersion}:${request.seed}:${scenario.id}`,
  )
  const { ballStart, goalMouth } = scenario.geometry
  // Deliberately not clamped: a player may aim outside the real goal mouth.
  const targetPosition = {
    x: ballStart.x + input.normalizedDirectionX * 0.55,
    y: ballStart.y + input.normalizedDirectionY * 0.6,
  }
  const humanExecutionScore = calculateHumanScore(input)
  const playerAbilityScore = calculatePlayerScore(player)
  const contextScore = calculateContextScore(scenario)
  const finalShotQuality = clampUnit(
    humanExecutionScore * weights.humanExecution +
      playerAbilityScore * weights.playerAbility +
      contextScore * weights.context,
  )
  const errorMagnitude =
    (1 - finalShotQuality) * 0.26 +
    Math.abs(input.normalizedPower - 0.66) * 0.11
  const actualBallDestination = {
    x:
      targetPosition.x +
      (rng.fork('destination-horizontal').nextFloat() - 0.5) *
        errorMagnitude *
        2,
    y:
      targetPosition.y +
      (rng.fork('destination-vertical').nextFloat() - 0.5) *
        errorMagnitude *
        1.5,
  }
  const ballWasOnTarget =
    classifyShotDestination(actualBallDestination, goalMouth) === 'on-target'
  const frameCollision = ballWasOnTarget
    ? resolveGoalFrameCollision(ballStart, actualBallDestination, goalMouth)
    : null
  const defenderBlockPoint =
    !ballWasOnTarget || frameCollision
      ? null
      : resolveDefenderBlock(
          rng,
          scenario,
          actualBallDestination,
          finalShotQuality,
        )
  const goalkeeperDecision =
    !ballWasOnTarget || frameCollision || defenderBlockPoint
      ? noInterception(scenario.geometry.goalkeeperStart)
      : resolveGoalkeeper(
          rng,
          scenario,
          actualBallDestination,
          finalShotQuality,
        )
  const outcome = !ballWasOnTarget
    ? 'off-target'
    : frameCollision
      ? 'post'
      : defenderBlockPoint
        ? 'blocked'
        : goalkeeperDecision.reachesBall
          ? 'saved'
          : 'goal'
  const postBounceDestination = frameCollision
    ? {
        x:
          actualBallDestination.x +
          (frameCollision === 'left-post'
            ? 0.08
            : frameCollision === 'right-post'
              ? -0.08
              : 0.035),
        y:
          actualBallDestination.y +
          (frameCollision === 'crossbar' ? 0.12 : 0.07),
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
    ballWasOnTarget,
    frameCollision,
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
    (0.18 + (1 - quality) * 0.36) * clampUnit(1 - closest.proximity / 0.17),
  )
  return rng.fork('defender-block').chance(chance) ? closest.position : null
}
const resolveGoalkeeper = (
  rng: SeededRng,
  scenario: ResolveShotRequest['scenario'],
  destination: NormalizedPoint,
  quality: number,
): GoalkeeperDecision => {
  const {
    goalkeeperStart: startPosition,
    goalMouth,
    ballStart,
  } = scenario.geometry
  const profile = scenario.goalkeeper
  const intendedDirection = screenSideForPoint(destination, startPosition.x)
  const nearPostSide =
    ballStart.x < 0.5 ? 'left' : ballStart.x > 0.5 ? 'right' : 'stay'
  const readingChance = clampUnit(
    0.25 +
      profile.reading / 180 +
      (scenario.context.goalkeeperCoversNearPost &&
      nearPostSide === intendedDirection
        ? 0.12
        : 0),
  )
  const readWasCorrect = rng.fork('goalkeeper-reading').chance(readingChance)
  const wrongFullCommit =
    !readWasCorrect &&
    intendedDirection !== 'stay' &&
    rng.fork('goalkeeper-opposite-commit').chance(0.07)
  const wrongSide =
    intendedDirection === 'left'
      ? 'right'
      : intendedDirection === 'right'
        ? 'left'
        : 'stay'
  const diveDirection = readWasCorrect
    ? intendedDirection
    : wrongFullCommit
      ? wrongSide
      : 'stay'
  const reactionScore = clampUnit(
    0.25 +
      profile.reflexes / 150 +
      rng.fork('goalkeeper-reaction').nextFloat() * 0.14 -
      quality * 0.1,
  )
  const reachScore = clampUnit(
    0.12 +
      profile.reach / 150 +
      rng.fork('goalkeeper-reach').nextFloat() * 0.12,
  )
  const interception = clampToGoal(
    lerpPoint(ballStart, destination, 0.74),
    goalMouth,
    0.02,
  )
  const shotTravelTime = 0.42 + (ballStart.y - destination.y) * 0.34
  const availableTravel = Math.max(
    0.035,
    (0.055 + (profile.reach / 100) * 0.18 + (profile.reflexes / 100) * 0.08) *
      reactionScore *
      shotTravelTime *
      2.8,
  )
  const wrongStep =
    !readWasCorrect &&
    intendedDirection !== 'stay' &&
    rng.fork('goalkeeper-first-step').chance(0.72)
      ? {
          x: startPosition.x + (wrongSide === 'left' ? -1 : 1) * 0.04,
          y: startPosition.y + 0.008,
        }
      : null
  const wrongStepClamped = wrongStep
    ? clampToGoal(wrongStep, goalMouth, 0.02)
    : null
  const remainingTravel = Math.max(
    0,
    availableTravel -
      (wrongStepClamped ? distance(startPosition, wrongStepClamped) : 0),
  )
  const desired = readWasCorrect
    ? interception
    : lerpPoint(startPosition, interception, wrongFullCommit ? 0.18 : 0.52)
  const final = clampToGoal(
    moveTowards(wrongStepClamped ?? startPosition, desired, remainingTravel),
    goalMouth,
    0.02,
  )
  const reachesBall =
    readWasCorrect &&
    distance(final, interception) <= 0.035 + reachScore * 0.09 &&
    reactionScore > 0.3
  return {
    startPosition,
    diveDirection,
    readWasCorrect,
    reactionScore,
    reachScore,
    availableTravel,
    wrongFullCommit,
    movement: {
      start: startPosition,
      wrongStep: wrongStepClamped,
      final,
      interception: reachesBall ? interception : null,
    },
    interceptionPoint: reachesBall ? interception : null,
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
  availableTravel: 0,
  wrongFullCommit: false,
  movement: {
    start: startPosition,
    wrongStep: null,
    final: startPosition,
    interception: null,
  },
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
  if (outcome === 'post') messages.push('Le cadre repousse la frappe.')
  if (outcome === 'off-target') messages.push('La frappe sort du cadre.')
  if (outcome === 'saved') messages.push('Gardien au point d’interception.')
  if (outcome === 'goal' && !goalkeeper.readWasCorrect)
    messages.push('Gardien en retard ou mal orienté.')
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
