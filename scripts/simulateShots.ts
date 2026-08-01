import { SeededRng } from '../src/core/rng/SeededRng'
import {
  isInsideGoalMouth,
  resolveShot,
  SHOT_SCENARIOS,
  SHOT_SIMULATION_VERSION,
} from '../src/moments/shooting'
import type {
  ShotInput,
  ShotOutcome,
  ShotScenario,
} from '../src/moments/shooting'

const RANDOM_TOTAL = 10_000
const MATRIX_SEEDS = 400
type Stats = Record<ShotOutcome, number> & {
  quality: number
  correctRead: number
  wrongStep: number
  oppositeCommit: number
  insufficientReach: number
  leftPost: number
  rightPost: number
  crossbar: number
  onTarget: number
  count: number
}
const emptyStats = (): Stats => ({
  goal: 0,
  saved: 0,
  blocked: 0,
  post: 0,
  'off-target': 0,
  quality: 0,
  correctRead: 0,
  wrongStep: 0,
  oppositeCommit: 0,
  insufficientReach: 0,
  leftPost: 0,
  rightPost: 0,
  crossbar: 0,
  onTarget: 0,
  count: 0,
})
const add = (stats: Stats, result: ReturnType<typeof resolveShot>): void => {
  stats[result.outcome] += 1
  stats.quality += result.finalShotQuality
  stats.correctRead += Number(result.goalkeeperDecision.readWasCorrect)
  stats.wrongStep += Number(
    result.goalkeeperDecision.movement.wrongStep !== null,
  )
  stats.oppositeCommit += Number(result.goalkeeperDecision.wrongFullCommit)
  stats.insufficientReach += Number(
    result.goalkeeperDecision.readWasCorrect &&
      !result.goalkeeperDecision.reachesBall,
  )
  stats.leftPost += Number(result.frameCollision === 'left-post')
  stats.rightPost += Number(result.frameCollision === 'right-post')
  stats.crossbar += Number(result.frameCollision === 'crossbar')
  stats.onTarget += Number(result.ballWasOnTarget)
  stats.count += 1
}
const report = (stats: Stats): string => {
  const rate = (value: number) => `${((value / stats.count) * 100).toFixed(1)}%`
  const onTargetRate = (value: number) =>
    stats.onTarget === 0
      ? '0.0%'
      : `${((value / stats.onTarget) * 100).toFixed(1)}%`
  return `cadrés ${rate(stats.onTarget)} | buts ${rate(stats.goal)} (${onTargetRate(stats.goal)} cadrés) | arrêts ${rate(stats.saved)} (${onTargetRate(stats.saved)} cadrés) | blocs ${rate(stats.blocked)} | poteaux ${rate(stats.post)} [G ${stats.leftPost}, D ${stats.rightPost}, barre ${stats.crossbar}] | hors ${rate(stats['off-target'])} | q ${(stats.quality / stats.count).toFixed(3)} | lecture ${rate(stats.correctRead)} | appui erroné ${rate(stats.wrongStep)} | opposé complet ${rate(stats.oppositeCommit)} | portée insuffisante ${rate(stats.insufficientReach)}`
}
const normalizeDirection = (
  x: number,
  y: number,
): Pick<ShotInput, 'normalizedDirectionX' | 'normalizedDirectionY'> => {
  const length = Math.max(1, Math.hypot(x, y))
  return { normalizedDirectionX: x / length, normalizedDirectionY: y / length }
}
const assertInside = (
  result: ReturnType<typeof resolveShot>,
  scenario: ShotScenario,
): void => {
  if (
    (result.outcome === 'goal' || result.outcome === 'saved') &&
    !isInsideGoalMouth(
      result.actualBallDestination,
      scenario.geometry.goalMouth,
    )
  )
    throw new Error(`Invalid ${result.outcome}: destination outside goal`)
}

console.log(
  `Balayage aléatoire déterministe — ${RANDOM_TOTAL} frappes (${SHOT_SIMULATION_VERSION})`,
)
const randomStats = emptyStats()
const randomByScenario = new Map<string, Stats>()
for (let index = 0; index < RANDOM_TOTAL; index += 1) {
  const scenario = SHOT_SCENARIOS[index % SHOT_SCENARIOS.length]!
  const rng = new SeededRng(`shooting-v3-sweep:${index}`)
  const direction = normalizeDirection(
    rng.nextFloat() * 1.6 - 0.8,
    -(0.25 + rng.nextFloat() * 0.75),
  )
  const input: ShotInput = {
    ...direction,
    normalizedPower: 0.12 + rng.nextFloat() * 0.88,
    releaseTiming: rng.nextFloat(),
  }
  const result = resolveShot({
    simulationVersion: SHOT_SIMULATION_VERSION,
    seed: `sweep:${index}`,
    scenario,
    player: { ...scenario.defaultPlayer, shooting: [48, 70, 88][index % 3]! },
    input,
  })
  assertInside(result, scenario)
  add(randomStats, result)
  const scenarioStats = randomByScenario.get(scenario.id) ?? emptyStats()
  add(scenarioStats, result)
  randomByScenario.set(scenario.id, scenarioStats)
}
console.log(`Global : ${report(randomStats)}`)
for (const scenario of SHOT_SCENARIOS)
  console.log(`- ${scenario.id}: ${report(randomByScenario.get(scenario.id)!)}`)
const gestures = {
  mauvais: { directionScale: 0.18, power: 0.14, timing: 0.04 },
  moyen: { directionScale: 0.7, power: 0.44, timing: 0.33 },
  bon: { directionScale: 0.9, power: 0.66, timing: 0.58 },
  excellent: { directionScale: 0.96, power: 0.66, timing: 0.58 },
} as const
console.log(`\nMatrice contrôlée — ${MATRIX_SEEDS} seeds par combinaison`)
for (const scenario of SHOT_SCENARIOS) {
  console.log(`\n${scenario.label}`)
  for (const [name, quality] of Object.entries(gestures))
    for (const shooting of [48, 70, 88]) {
      const stats = emptyStats()
      const input = inputForScenario(scenario, quality)
      for (let index = 0; index < MATRIX_SEEDS; index += 1) {
        const result = resolveShot({
          simulationVersion: SHOT_SIMULATION_VERSION,
          seed: `matrix:${scenario.id}:${name}:${shooting}:${index}`,
          scenario,
          player: { ...scenario.defaultPlayer, shooting },
          input,
        })
        assertInside(result, scenario)
        add(stats, result)
      }
      console.log(`- ${name.padEnd(10)} · tir ${shooting}: ${report(stats)}`)
    }
}
function inputForScenario(
  scenario: ShotScenario,
  quality: {
    readonly directionScale: number
    readonly power: number
    readonly timing: number
  },
): ShotInput {
  const dx = (scenario.targetGuide.x - scenario.geometry.ballStart.x) / 0.55
  const dy = (scenario.targetGuide.y - scenario.geometry.ballStart.y) / 0.6
  const base = normalizeDirection(dx, dy)
  return {
    normalizedDirectionX: base.normalizedDirectionX * quality.directionScale,
    normalizedDirectionY: base.normalizedDirectionY * quality.directionScale,
    normalizedPower: quality.power,
    releaseTiming: quality.timing,
  }
}
