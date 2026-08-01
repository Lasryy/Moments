import type { PlayerId } from '../core/ids/types'
import type { SeasonSummary } from './seasons/types'
export interface CareerState {
  readonly controlledPlayerId: PlayerId
  readonly currentSeasonStartYear: number
  readonly seasonHistory: readonly SeasonSummary[]
  readonly isRetired: boolean
}
