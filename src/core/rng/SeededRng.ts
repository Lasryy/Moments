export interface WeightedItem<T> {
  readonly value: T
  readonly weight: number
}
type Seed = string | number
const UINT32_RANGE = 0x1_0000_0000
const FALLBACK_STATE = 0x6d2b79f5

/** Browser-independent deterministic generator. Forks derive from the original
 * seed, keeping named subsystem streams stable despite parent consumption. */
export class SeededRng {
  private state: number
  private readonly seed: Seed

  public constructor(seed: Seed) {
    this.seed = seed
    this.state = hashSeed(seed)
  }
  public nextFloat(): number {
    let value = this.state
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    this.state = value >>> 0
    return this.state / UINT32_RANGE
  }
  public nextInt(minInclusive: number, maxInclusive: number): number {
    if (
      !Number.isSafeInteger(minInclusive) ||
      !Number.isSafeInteger(maxInclusive)
    )
      throw new RangeError('nextInt bounds must be safe integers.')
    if (minInclusive > maxInclusive)
      throw new RangeError('nextInt minimum must not exceed maximum.')
    const range = maxInclusive - minInclusive + 1
    if (!Number.isSafeInteger(range))
      throw new RangeError('nextInt range must be a safe integer.')
    return minInclusive + Math.floor(this.nextFloat() * range)
  }
  public chance(probability: number): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1)
      throw new RangeError(
        'Probability must be a finite number between 0 and 1.',
      )
    return this.nextFloat() < probability
  }
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0)
      throw new RangeError('Cannot pick from an empty collection.')
    return items[this.nextInt(0, items.length - 1)] as T
  }
  public weightedPick<T>(items: readonly WeightedItem<T>[]): T {
    if (items.length === 0)
      throw new RangeError('Cannot pick from an empty collection.')
    const totalWeight = items.reduce((total, item) => {
      if (!Number.isFinite(item.weight) || item.weight < 0)
        throw new RangeError(
          'Each weight must be a finite non-negative number.',
        )
      return total + item.weight
    }, 0)
    if (totalWeight <= 0)
      throw new RangeError('At least one weight must be greater than zero.')
    const target = this.nextFloat() * totalWeight
    let cumulativeWeight = 0
    for (const item of items) {
      cumulativeWeight += item.weight
      if (target < cumulativeWeight) return item.value
    }
    return items[items.length - 1]!.value
  }
  public shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index)
      ;[shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex]!,
        shuffled[index]!,
      ]
    }
    return shuffled
  }
  public fork(namespace: string): SeededRng {
    if (namespace.trim().length === 0)
      throw new RangeError('Fork namespace must not be empty.')
    return new SeededRng(`${String(this.seed)}::${namespace}`)
  }
}
const hashSeed = (seed: Seed): number => {
  const text = String(seed)
  if (text.length === 0 || (typeof seed === 'number' && !Number.isFinite(seed)))
    throw new TypeError('Seed must be a non-empty string or a finite number.')
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash === 0 ? FALLBACK_STATE : hash >>> 0
}
