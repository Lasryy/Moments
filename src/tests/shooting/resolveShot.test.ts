import { describe, expect, it } from 'vitest'
import resolveShotSource from '../../moments/shooting/resolveShot.ts?raw'
import {
  calculateContextScore,
  getShotScenario,
  resolveShot,
  SHOT_SCENARIOS,
  SHOT_SIMULATION_VERSION,
} from '../../moments/shooting'
import type { ShotInput } from '../../moments/shooting'

const goodInput: ShotInput = {
  normalizedDirectionX: 0.45,
  normalizedDirectionY: -0.78,
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

describe('shooting-v2 resolution', () => {
  it('reproduces a same seed, scenario and input exactly', () =>
    expect(resolveShot(request('repeat'))).toEqual(
      resolveShot(request('repeat')),
    ))
  it('uses unique named streams instead of recreating a same fork', () => {
    const streams = [...resolveShotSource.matchAll(/fork\('([^']+)'\)/g)].map(
      (match) => match[1],
    )
    expect(new Set(streams).size).toBe(streams.length)
    expect(streams).toEqual(
      expect.arrayContaining([
        'destination-horizontal',
        'destination-vertical',
        'goalkeeper-reading',
        'goalkeeper-reach',
        'defender-block',
        'post-collision',
      ]),
    )
  })
  it('varies goalkeeper reads across deterministic seeds', () => {
    const decisions = new Set(
      Array.from({ length: 30 }, (_, index) => {
        const decision = resolveShot(
          request(`keeper:${index}`),
        ).goalkeeperDecision
        return `${decision.diveDirection}:${decision.readWasCorrect}:${decision.reactionScore}`
      }),
    )
    expect(decisions.size).toBeGreaterThan(2)
  })
  it('lets the goalkeeper sometimes read correctly and sometimes choose wrongly', () => {
    const decisions = Array.from(
      { length: 120 },
      (_, index) => resolveShot(request(`read:${index}`)).goalkeeperDecision,
    )
    expect(decisions.some((decision) => decision.readWasCorrect)).toBe(true)
    expect(decisions.some((decision) => !decision.readWasCorrect)).toBe(true)
  })
  it('changes destination when the normalized gesture changes', () =>
    expect(resolveShot(request('direction')).actualBallDestination).not.toEqual(
      resolveShot(
        request('direction', 'central-one-on-one', {
          ...goodInput,
          normalizedDirectionX: -0.45,
        }),
      ).actualBallDestination,
    ))
  it('uses configured geometry for visually distinct situations', () => {
    const central = getShotScenario('central-one-on-one')
    const angle = getShotScenario('tight-angle')
    expect(SHOT_SCENARIOS).toHaveLength(4)
    expect(angle.geometry.ballStart).not.toEqual(central.geometry.ballStart)
    expect(angle.geometry.goalkeeperStart).not.toEqual(
      central.geometry.goalkeeperStart,
    )
    expect(
      getShotScenario('defender-contact').geometry.defenderPositions,
    ).toHaveLength(1)
  })
  it('forbids blocks without defenders and allows them with one', () => {
    for (let index = 0; index < 100; index += 1)
      expect(resolveShot(request(`central:${index}`)).outcome).not.toBe(
        'blocked',
      )
    expect(
      resolveShot(request('v2-defender-contact-0', 'defender-contact')).outcome,
    ).toBe('blocked')
  })
  it('keeps every outcome reachable with explicit v2 fixtures', () => {
    expect(resolveShot(request('v2-central-one-on-one-0')).outcome).toBe('goal')
    expect(resolveShot(request('v2-central-one-on-one-4')).outcome).toBe(
      'saved',
    )
    expect(
      resolveShot(request('v2-defender-contact-0', 'defender-contact')).outcome,
    ).toBe('blocked')
    const edge: ShotInput = {
      normalizedDirectionX: 0.2,
      normalizedDirectionY: -0.85,
      normalizedPower: 1,
      releaseTiming: 1,
    }
    expect(
      resolveShot(request('v2-tight-angle-46', 'tight-angle', edge)).outcome,
    ).toBe('post')
    expect(
      resolveShot(request('v2-tight-angle-0', 'tight-angle', edge)).outcome,
    ).toBe('off-target')
  })
  it('keeps the gesture, player and context hierarchy understandable', () => {
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
    expect(frozen.geometry.defenderPositions).toHaveLength(1)
    expect(resolveShotSource).not.toMatch(
      /from ['"](?:react|react-dom)|\b(?:window|document|canvas)\b/i,
    )
  })
})
