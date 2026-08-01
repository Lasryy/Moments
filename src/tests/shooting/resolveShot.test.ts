import { describe, expect, it } from 'vitest'
import resolveShotSource from '../../moments/shooting/resolveShot.ts?raw'
import {
  DEFAULT_SHOT_WEIGHTS,
  deserializeShotInput,
  getShotScenario,
  normalizeShotInput,
  normalizeShotWeights,
  resolveShot,
  serializeShotInput,
  SHOT_SCENARIOS,
  SHOT_SIMULATION_VERSION,
} from '../../moments/shooting'
import type { ShotInput } from '../../moments/shooting'

const input: ShotInput = {
  normalizedDirectionX: 0.45,
  normalizedDirectionY: -0.78,
  normalizedPower: 0.66,
  releaseTiming: 0.52,
}
const request = (
  seed: string,
  scenarioId = 'central-one-on-one',
  shotInput = input,
) => {
  const scenario = getShotScenario(scenarioId)
  return {
    simulationVersion: SHOT_SIMULATION_VERSION,
    seed,
    scenario,
    player: scenario.defaultPlayer,
    input: shotInput,
  }
}

describe('deterministic shooting engine', () => {
  it('reproduces exactly the same shot', () =>
    expect(resolveShot(request('fixture-0'))).toEqual(
      resolveShot(request('fixture-0')),
    ))
  it('allows a different seed to alter goalkeeper behaviour', () =>
    expect(
      resolveShot(request('fixture-0', 'defender-contact')).goalkeeperDecision
        .anticipationScore,
    ).not.toBe(
      resolveShot(request('fixture-1', 'defender-contact')).goalkeeperDecision
        .anticipationScore,
    ))
  it('changes the destination when the gesture changes', () =>
    expect(resolveShot(request('fixture-0')).actualBallDestination).not.toEqual(
      resolveShot(
        request('fixture-0', 'central-one-on-one', {
          ...input,
          normalizedDirectionX: -0.45,
        }),
      ).actualBallDestination,
    ))
  it('keeps normalized input values bounded and rejects invalid input', () => {
    expect(normalizeShotInput(input)).toEqual(input)
    expect(() =>
      normalizeShotInput({ ...input, normalizedPower: 1.1 }),
    ).toThrow()
    expect(() =>
      normalizeShotInput({
        ...input,
        normalizedDirectionX: 1,
        normalizedDirectionY: 1,
      }),
    ).toThrow()
  })
  it('normalizes weights and rejects an empty configuration', () => {
    expect(
      normalizeShotWeights({
        humanExecution: 55,
        playerAbility: 30,
        context: 15,
      }),
    ).toEqual(DEFAULT_SHOT_WEIGHTS)
    expect(() =>
      normalizeShotWeights({ humanExecution: 0, playerAbility: 0, context: 0 }),
    ).toThrow(RangeError)
  })
  it('exposes every configured scenario through data', () => {
    expect(SHOT_SCENARIOS).toHaveLength(4)
    expect(
      SHOT_SCENARIOS.map((scenario) => getShotScenario(scenario.id).id),
    ).toEqual(SHOT_SCENARIOS.map((scenario) => scenario.id))
    expect(() => getShotScenario('unknown')).toThrow(RangeError)
  })
  it('covers deterministic fixtures for each outcome', () => {
    expect(resolveShot(request('fixture-0', 'defender-contact')).outcome).toBe(
      'goal',
    )
    expect(resolveShot(request('fixture-2', 'defender-contact')).outcome).toBe(
      'saved',
    )
    expect(resolveShot(request('fixture-9', 'defender-contact')).outcome).toBe(
      'blocked',
    )
    const edgeInput = {
      normalizedDirectionX: 0.82,
      normalizedDirectionY: -0.55,
      normalizedPower: 1,
      releaseTiming: 1,
    }
    expect(
      resolveShot(
        request('edge-central-one-on-one-16', 'central-one-on-one', edgeInput),
      ).outcome,
    ).toBe('post')
    expect(
      resolveShot(
        request('edge-central-one-on-one-4', 'central-one-on-one', edgeInput),
      ).outcome,
    ).toBe('off-target')
  })
  it('does not mutate request objects', () => {
    const scenario = getShotScenario('defender-contact')
    const frozenInput = Object.freeze({ ...input })
    const frozenPlayer = Object.freeze({ ...scenario.defaultPlayer })
    const frozenContext = Object.freeze({ ...scenario.context })
    const frozenScenario = Object.freeze({
      ...scenario,
      defaultPlayer: frozenPlayer,
      context: frozenContext,
    })
    resolveShot({
      simulationVersion: SHOT_SIMULATION_VERSION,
      seed: 'immutable',
      scenario: frozenScenario,
      player: frozenPlayer,
      input: frozenInput,
    })
    expect(frozenInput).toEqual(input)
    expect(frozenScenario.context).toEqual(scenario.context)
  })
  it('serializes a gesture for exact reproduction', () =>
    expect(deserializeShotInput(serializeShotInput(input))).toEqual(input))
  it('keeps the engine free of React and browser rendering imports', () =>
    expect(resolveShotSource).not.toMatch(
      /from ['"](?:react|react-dom)|\b(?:window|document|canvas)\b/i,
    ))
})
