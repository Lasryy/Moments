import type { EventId, PlayerId } from '../../core/ids/types'
export type WorldEventCategory =
  'sporting' | 'media' | 'financial' | 'relationship' | 'extreme'
export interface WorldEvent {
  readonly id: EventId
  readonly category: WorldEventCategory
  readonly involvedPlayerIds: readonly PlayerId[]
  readonly triggeredSeasonStartYear: number
  readonly summary: string
  readonly isSecret: boolean
}
export interface DeferredConsequence {
  readonly eventId: EventId
  readonly resolvesSeasonStartYear: number
  readonly conditionDescription: string
  readonly outcomeDescription: string
}
