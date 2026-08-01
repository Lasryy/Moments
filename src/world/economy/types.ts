import type { PlayerId, SeasonId } from '../../core/ids/types'
export interface MarketValue {
  readonly playerId: PlayerId
  readonly marketValueEur: number
  readonly assessedSeasonStartYear: number
}
export interface PlayerFinancialSeason {
  readonly playerId: PlayerId
  readonly seasonId: SeasonId
  readonly seasonStartYear: number
  readonly salaryAnnualEur: number
  readonly bonusesEur: number
  readonly endorsementsEur: number
  readonly personalExpensesEur: number
  readonly personalWealthEur: number
}
