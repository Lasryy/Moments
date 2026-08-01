import { SeededRng } from '../src/core/rng/SeededRng'
import {
  DEFAULT_SHOT_WEIGHTS,
  resolveShot,
  SHOT_SCENARIOS,
  SHOT_SIMULATION_VERSION,
} from '../src/moments/shooting'
import type { ShotOutcome } from '../src/moments/shooting'

const TOTAL_SHOTS = 10_000
const outcomes: Record<ShotOutcome, number> = {
  goal: 0,
  saved: 0,
  blocked: 0,
  post: 0,
  'off-target': 0,
}
const byScenario = new Map<
  string,
  { count: number; quality: number; goals: number }
>()
const byShooting = new Map<
  number,
  { count: number; quality: number; goals: number }
>()
for (let index = 0; index < TOTAL_SHOTS; index += 1) {
  const scenario = SHOT_SCENARIOS[index % SHOT_SCENARIOS.length]!
  const rating = [48, 70, 88][index % 3]!
  const rng = new SeededRng(`shot-sweep:${index}`)
  const rawDirectionX = rng.nextFloat() * 1.5 - 0.75
  const rawDirectionY = -(0.45 + rng.nextFloat() * 0.55)
  const directionScale = Math.max(1, Math.hypot(rawDirectionX, rawDirectionY))
  const input = {
    normalizedDirectionX: rawDirectionX / directionScale,
    normalizedDirectionY: rawDirectionY / directionScale,
    normalizedPower: 0.25 + rng.nextFloat() * 0.75,
    releaseTiming: rng.nextFloat(),
  }
  const result = resolveShot({
    simulationVersion: SHOT_SIMULATION_VERSION,
    seed: `sweep:${index}`,
    scenario,
    player: { ...scenario.defaultPlayer, shooting: rating },
    input,
    weights: DEFAULT_SHOT_WEIGHTS,
  })
  outcomes[result.outcome] += 1
  const scenarioStats = byScenario.get(scenario.id) ?? {
    count: 0,
    quality: 0,
    goals: 0,
  }
  scenarioStats.count += 1
  scenarioStats.quality += result.finalShotQuality
  scenarioStats.goals += Number(result.outcome === 'goal')
  byScenario.set(scenario.id, scenarioStats)
  const ratingStats = byShooting.get(rating) ?? {
    count: 0,
    quality: 0,
    goals: 0,
  }
  ratingStats.count += 1
  ratingStats.quality += result.finalShotQuality
  ratingStats.goals += Number(result.outcome === 'goal')
  byShooting.set(rating, ratingStats)
}
const percent = (value: number, total = TOTAL_SHOTS): string =>
  `${((value / total) * 100).toFixed(2)} %`
console.log(`Simulation déterministe : ${TOTAL_SHOTS} frappes`)
console.log(
  Object.entries(outcomes)
    .map(([outcome, count]) => `${outcome}: ${percent(count)}`)
    .join(' | '),
)
console.log(
  `Qualité moyenne : ${(Array.from(byScenario.values()).reduce((sum, item) => sum + item.quality, 0) / TOTAL_SHOTS).toFixed(3)}`,
)
console.log('Par scénario :')
for (const scenario of SHOT_SCENARIOS) {
  const stats = byScenario.get(scenario.id)!
  console.log(
    `- ${scenario.id}: buts ${percent(stats.goals, stats.count)}, qualité ${(stats.quality / stats.count).toFixed(3)}`,
  )
}
console.log('Par niveau de tir :')
for (const [rating, stats] of byShooting)
  console.log(
    `- ${rating}: buts ${percent(stats.goals, stats.count)}, qualité ${(stats.quality / stats.count).toFixed(3)}`,
  )
