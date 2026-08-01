import { z } from 'zod'
import type { ShotInput } from './types'

export const ShotInputSchema = z.object({
  normalizedDirectionX: z.number().finite().min(-1).max(1),
  normalizedDirectionY: z.number().finite().min(-1).max(1),
  normalizedPower: z.number().finite().min(0).max(1),
  releaseTiming: z.number().finite().min(0).max(1),
})

export const validateShotInput = (input: ShotInput): ShotInput =>
  ShotInputSchema.parse(input)
export const normalizeShotInput = (input: ShotInput): ShotInput => {
  const directionLength = Math.hypot(
    input.normalizedDirectionX,
    input.normalizedDirectionY,
  )
  if (directionLength > 1.000001)
    throw new RangeError('Shot direction magnitude must not exceed 1.')
  return validateShotInput(input)
}
export const serializeShotInput = (input: ShotInput): string =>
  JSON.stringify(validateShotInput(input))
export const deserializeShotInput = (serialized: string): ShotInput =>
  validateShotInput(ShotInputSchema.parse(JSON.parse(serialized)))
