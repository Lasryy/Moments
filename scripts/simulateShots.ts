import { SeededRng } from '../src/core/rng/SeededRng'
import {
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
  wrongSide: number
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
  wrongSide: 0,
  count: 0,
})
const add = (stats: Stats, result: ReturnType<typeof resolveShot>): void => {
  stats[result.outcome] += 1
  stats.quality += result.finalShotQuality
  stats.correctRead += Number(result.goalkeeperDecision.readWasCorrect)
  stats.wrongSide += Number(
    !result.goalkeeperDecision.readWasCorrect &&
      result.goalkeeperDecision.diveDirection !== 'stay',
  )
  stats.count += 1
}
const report = (stats: Stats): string => {
  const rate = (value: number) => `${((value / stats.count) * 100).toFixed(1)}%`
  return `buts ${rate(stats.goal)} | arrêts ${rate(stats.saved)} | blocs ${rate(stats.blocked)} | poteaux ${rate(stats.post)} | hors ${rate(stats['off-target'])} | q ${(stats.quality / stats.count).toFixed(3)} | lecture ${rate(stats.correctRead)} | mauvais côté ${rate(stats.wrongSide)}`
}
const normalizeDirection = (
  x: number,
  y: number,
): Pick<ShotInput, 'normalizedDirectionX' | 'normalizedDirectionY'> => {
  const length = Math.max(1, Math.hypot(x, y))
  return { normalizedDirectionX: x / length, normalizedDirectionY: y / length }
}

console.log(
  `Balayage aléatoire déterministe — ${RANDOM_TOTAL} frappes (${SHOT_SIMULATION_VERSION})`,
)
const randomStats = emptyStats()
const randomByScenario = new Map<string, Stats>()
for (let index = 0; index < RANDOM_TOTAL; index += 1) {
  const scenario = SHOT_SCENARIOS[index % SHOT_SCENARIOS.length]!
  const rng = new SeededRng(`shooting-v2-sweep:${index}`)
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
  add(randomStats, result)
  const scenarioStats = randomByScenario.get(scenario.id) ?? emptyStats()
  add(scenarioStats, result)
  randomByScenario.set(scenario.id, scenarioStats)
}
console.log(`Global : ${report(randomStats)}`)
for (const scenario of SHOT_SCENARIOS)
  console.log(`- ${scenario.id}: ${report(randomByScenario.get(scenario.id)!)}`)

const gestureQuality = {
  mauvais: { directionScale: 0.18, power: 0.14, timing: 0.04 },
  moyen: { directionScale: 0.7, power: 0.44, timing: 0.33 },
  bon: { directionScale: 0.9, power: 0.66, timing: 0.58 },
  excellent: { directionScale: 0.96, power: 0.66, timing: 0.58 },
} as const
console.log(`\nMatrice contrôlée — ${MATRIX_SEEDS} seeds par combinaison`)
for (const scenario of SHOT_SCENARIOS) {
  console.log(`\n${scenario.label}`)
  for (const [gestureName, quality] of Object.entries(gestureQuality)) {
    const input = inputForScenario(scenario, quality)
    for (const shooting of [48, 70, 88]) {
      const stats = controlledStats(scenario, input, shooting, gestureName)
      console.log(
        `- ${gestureName.padEnd(10)} · tir ${shooting}: ${report(stats)}`,
      )
    }
  }
}
function controlledStats(
  scenario: ShotScenario,
  input: ShotInput,
  shooting: number,
  gestureName: string,
): Stats {
  const stats = emptyStats()
  for (let index = 0; index < MATRIX_SEEDS; index += 1)
    add(
      stats,
      resolveShot({
        simulationVersion: SHOT_SIMULATION_VERSION,
        seed: `matrix:${scenario.id}:${gestureName}:${shooting}:${index}`,
        scenario,
        player: { ...scenario.defaultPlayer, shooting },
        input,
      }),
    )
  return stats
}
function inputForScenario(
  scenario: ShotScenario,
  quality: {
    readonly directionScale: number
    readonly power: number
    readonly timing: number
  },
): ShotInput {
  const dx = (scenario.targetGuide.x - scenario.geometry.ballStart.x) / 0.5
  const dy = (scenario.targetGuide.y - scenario.geometry.ballStart.y) / 0.9
  const baseDirection = normalizeDirection(dx, dy)
  const direction = {
    normalizedDirectionX:
      baseDirection.normalizedDirectionX * quality.directionScale,
    normalizedDirectionY:
      baseDirection.normalizedDirectionY * quality.directionScale,
  }
  return {
    ...direction,
    normalizedPower: quality.power,
    releaseTiming: quality.timing,
  }
}
