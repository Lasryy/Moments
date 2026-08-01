import type { PlayerId } from '../../core/ids/types'
export type MomentKind =
  | 'shot'
  | 'pass'
  | 'penalty'
  | 'free-kick'
  | 'dribble'
  | 'defensive-duel'
  | 'cross'
  | 'header'
  | 'goalkeeping'
export interface MomentScenario {
  readonly id: string
  readonly kind: MomentKind
  readonly playerId: PlayerId
  readonly opponentPlayerIds: readonly PlayerId[]
  readonly matchMinute: number
  readonly pressure: number
  readonly description: string
}
export interface MomentResult {
  readonly scenarioId: string
  readonly outcome: 'success' | 'partial-success' | 'failure'
  readonly humanInputScore: number
  readonly attributeInfluence: number
  readonly contextInfluence: number
  readonly narrative: string
}
