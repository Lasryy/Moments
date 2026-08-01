import type { ClubId, PlayerId, SeasonId } from '../../core/ids/types'
export interface SeasonSummary {
  readonly seasonId: SeasonId
  readonly seasonStartYear: number
  readonly playerId: PlayerId
  readonly clubId: ClubId
  readonly appearances: number
  readonly goals: number
  readonly assists: number
  readonly averageRating: number
  readonly minutesPlayed: number
}
