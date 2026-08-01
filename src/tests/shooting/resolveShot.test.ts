import { describe, expect, it } from 'vitest'
import resolveShotSource from '../../moments/shooting/resolveShot.ts?raw'
import {
  calculateContextScore,
  DEFAULT_GOAL_MOUTH,
  getShotScenario,
  isInsideGoalMouth,
  resolveGoalFrameCollision,
  resolveShot,
  SHOT_SCENARIOS,
  SHOT_SIMULATION_VERSION,
} from '../../moments/shooting'
import type { ShotInput } from '../../moments/shooting'

const goodInput: ShotInput = {
  normalizedDirectionX: 0.35,
  normalizedDirectionY: -0.88,
  normalizedPower: 0.66,
  releaseTiming: 0.58,
}
const badInput: ShotInput = {
  normalizedDirectionX: 0.08,
  normalizedDirectionY: -0.12,
  normalizedPower: 0.12,
  releaseTiming: 0.05,
}
const request = (
  seed: string,
  scenarioId = 'central-one-on-one',
  input = goodInput,
  shooting?: number,
) => {
  const scenario = getShotScenario(scenarioId)
  return {
    simulationVersion: SHOT_SIMULATION_VERSION,
    seed,
    scenario,
    player: {
      ...scenario.defaultPlayer,
      ...(shooting === undefined ? {} : { shooting }),
    },
    input,
  }
}
const average = (
  scenarioId: string,
  input: ShotInput,
  shooting: number,
): number => {
  let total = 0
  for (let index = 0; index < 300; index += 1)
    total += resolveShot(
      request(
        `average:${scenarioId}:${shooting}:${index}`,
        scenarioId,
        input,
        shooting,
      ),
    ).finalShotQuality
  return total / 300
}

describe('shooting-v3 geometry and resolution', () => {
  it('reproduces a same seed, scenario and input exactly', () =>
    expect(resolveShot(request('repeat'))).toEqual(
      resolveShot(request('repeat')),
    ))
  it('uses distinct named deterministic streams', () => {
    const streams = [...resolveShotSource.matchAll(/fork\('([^']+)'\)/g)].map(
      (match) => match[1],
    )
    expect(new Set(streams).size).toBe(streams.length)
    expect(streams).toEqual(
      expect.arrayContaining([
        'destination-horizontal',
        'destination-vertical',
        'goalkeeper-reading',
        'goalkeeper-reaction',
        'goalkeeper-reach',
        'goalkeeper-first-step',
        'goalkeeper-opposite-commit',
        'defender-block',
      ]),
    )
  })
  it('uses its shared narrow goal mouth for every scenario', () => {
    expect(DEFAULT_GOAL_MOUTH).toEqual({
      left: 0.2,
      right: 0.8,
      top: 0.12,
      bottom: 0.5,
      postRadius: 0.012,
      crossbarRadius: 0.012,
    })
    expect(
      SHOT_SCENARIOS.every(
        (scenario) => scenario.geometry.goalMouth === DEFAULT_GOAL_MOUTH,
      ),
    ).toBe(true)
  })
  it('classifies exact cage limits correctly', () => {
    expect(isInsideGoalMouth({ x: 0.5, y: 0.3 }, DEFAULT_GOAL_MOUTH)).toBe(true)
    expect(
      isInsideGoalMouth({ x: 0.2 - 0.0001, y: 0.3 }, DEFAULT_GOAL_MOUTH),
    ).toBe(false)
    expect(
      isInsideGoalMouth({ x: 0.8 + 0.0001, y: 0.3 }, DEFAULT_GOAL_MOUTH),
    ).toBe(false)
    expect(
      isInsideGoalMouth({ x: 0.5, y: 0.12 - 0.0001 }, DEFAULT_GOAL_MOUTH),
    ).toBe(false)
  })
  it('detects left post, right post and crossbar geometrically', () => {
    const start = { x: 0.5, y: 0.82 }
    expect(
      resolveGoalFrameCollision(start, { x: 0.2, y: 0.5 }, DEFAULT_GOAL_MOUTH),
    ).toBe('left-post')
    expect(
      resolveGoalFrameCollision(start, { x: 0.8, y: 0.5 }, DEFAULT_GOAL_MOUTH),
    ).toBe('right-post')
    expect(
      resolveGoalFrameCollision(start, { x: 0.5, y: 0.12 }, DEFAULT_GOAL_MOUTH),
    ).toBe('crossbar')
  })
  it('never yields a goal or save for an outside destination', () => {
    const outside: ShotInput = {
      normalizedDirectionX: -0.78,
      normalizedDirectionY: -0.62,
      normalizedPower: 0.66,
      releaseTiming: 0.58,
    }
    for (let index = 0; index < 120; index += 1) {
      const result = resolveShot(
        request(`outside:${index}`, 'central-one-on-one', outside),
      )
      if (!isInsideGoalMouth(result.actualBallDestination, DEFAULT_GOAL_MOUTH))
        expect(['goal', 'saved']).not.toContain(result.outcome)
    }
  })
  it('uses real geometry for a visibly distinct tight angle and true near post', () => {
    const central = getShotScenario('central-one-on-one')
    const angle = getShotScenario('tight-angle')
    expect(angle.geometry.ballStart.x).toBeGreaterThan(
      central.geometry.ballStart.x,
    )
    expect(angle.geometry.goalkeeperStart.x).toBeGreaterThan(
      central.geometry.goalkeeperStart.x,
    )
    expect(angle.geometry.goalMouth.right).toBe(0.8)
    expect(
      getShotScenario('defender-contact').geometry.defenderPositions,
    ).toHaveLength(1)
  })
  it('never blocks without defenders and reaches blocks with a defender', () => {
    for (let index = 0; index < 100; index += 1)
      expect(resolveShot(request(`central:${index}`)).outcome).not.toBe(
        'blocked',
      )
    const outcomes = Array.from(
      { length: 300 },
      (_, index) =>
        resolveShot(request(`defender:${index}`, 'defender-contact')).outcome,
    )
    expect(outcomes).toContain('blocked')
  })
  it('keeps human, player and context hierarchies understandable', () => {
    expect(average('central-one-on-one', goodInput, 70)).toBeGreaterThan(
      average('central-one-on-one', badInput, 70),
    )
    expect(average('central-one-on-one', goodInput, 88)).toBeGreaterThan(
      average('central-one-on-one', goodInput, 48),
    )
    expect(
      calculateContextScore(getShotScenario('central-one-on-one')),
    ).toBeGreaterThan(
      calculateContextScore(getShotScenario('decisive-fatigue')),
    )
  })
  it('keeps goalkeeper movement bounded, varied, and rarely fully opposite', () => {
    const decisions = Array.from(
      { length: 500 },
      (_, index) => resolveShot(request(`keeper:${index}`)).goalkeeperDecision,
    )
    expect(decisions.some((decision) => decision.readWasCorrect)).toBe(true)
    expect(decisions.some((decision) => !decision.readWasCorrect)).toBe(true)
    expect(
      decisions.some((decision) => decision.movement.wrongStep !== null),
    ).toBe(true)
    expect(
      decisions.filter((decision) => decision.wrongFullCommit).length /
        decisions.length,
    ).toBeLessThan(0.15)
    for (const decision of decisions) {
      const travelled = Math.hypot(
        decision.movement.final.x - decision.startPosition.x,
        decision.movement.final.y - decision.startPosition.y,
      )
      expect(travelled).toBeLessThanOrEqual(decision.availableTravel + 0.045)
      expect(decision.movement.final.x).toBeGreaterThanOrEqual(
        DEFAULT_GOAL_MOUTH.left,
      )
      expect(decision.movement.final.x).toBeLessThanOrEqual(
        DEFAULT_GOAL_MOUTH.right,
      )
    }
  })
  it('is immutable and free of React or rendering imports', () => {
    const scenario = getShotScenario('defender-contact')
    const frozen = Object.freeze({
      ...scenario,
      geometry: Object.freeze({
        ...scenario.geometry,
        defenderPositions: Object.freeze([
          ...scenario.geometry.defenderPositions,
        ]),
      }),
    })
    expect(() =>
      resolveShot({
        ...request('frozen', 'defender-contact'),
        scenario: frozen,
      }),
    ).not.toThrow()
    expect(resolveShotSource).not.toMatch(
      /from ['"](?:react|react-dom)|\b(?:window|document|canvas)\b/i,
    )
  })
})
