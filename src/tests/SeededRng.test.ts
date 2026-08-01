import { describe, expect, it } from 'vitest'
import { SeededRng } from '../core/rng/SeededRng'
describe('SeededRng', () => {
  it('reproduces the same sequence for the same seed', () => {
    const sequence = (seed: string) => {
      const rng = new SeededRng(seed)
      return [
        rng.nextFloat(),
        rng.nextInt(-5, 5),
        rng.chance(0.5),
        rng.pick(['a', 'b', 'c']),
      ]
    }
    expect(sequence('same-world')).toEqual(sequence('same-world'))
    expect(sequence('same-world')).not.toEqual(sequence('other-world'))
  })
  it('keeps forked streams independent from parent consumption', () => {
    const first = new SeededRng('world')
    const second = new SeededRng('world')
    first.nextFloat()
    first.nextFloat()
    expect(first.fork('transfers').nextFloat()).toBe(
      second.fork('transfers').nextFloat(),
    )
    expect(first.fork('transfers').nextFloat()).not.toBe(
      first.fork('injuries').nextFloat(),
    )
  })
  it('respects inclusive nextInt bounds', () => {
    const rng = new SeededRng('bounds')
    expect(rng.nextInt(4, 4)).toBe(4)
    for (let index = 0; index < 100; index += 1) {
      const value = rng.nextInt(-2, 3)
      expect(value).toBeGreaterThanOrEqual(-2)
      expect(value).toBeLessThanOrEqual(3)
    }
    expect(() => rng.nextInt(3.2, 4)).toThrow(RangeError)
    expect(() => rng.nextInt(5, 4)).toThrow(RangeError)
  })
  it('rejects invalid probabilities', () => {
    const rng = new SeededRng('probabilities')
    for (const probability of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => rng.chance(probability)).toThrow(RangeError)
  })
  it('rejects invalid weighted selections', () => {
    const rng = new SeededRng('weights')
    expect(() => rng.weightedPick([])).toThrow(RangeError)
    expect(() => rng.weightedPick([{ value: 'a', weight: -1 }])).toThrow(
      RangeError,
    )
    expect(() =>
      rng.weightedPick([{ value: 'a', weight: Number.NaN }]),
    ).toThrow(RangeError)
    expect(() => rng.weightedPick([{ value: 'a', weight: 0 }])).toThrow(
      RangeError,
    )
  })
  it('does not mutate input arrays while shuffling', () => {
    const source = [1, 2, 3, 4]
    const result = new SeededRng('shuffle').shuffle(source)
    expect(source).toEqual([1, 2, 3, 4])
    expect(result).not.toBe(source)
    expect([...result].sort()).toEqual(source)
  })
})
