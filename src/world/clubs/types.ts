import type { ClubId } from '../../core/ids/types'
export interface ClubFinances {
  readonly clubWealthEur: number
  readonly transferBudgetEur: number
  readonly wageBudgetAnnualEur: number
  readonly wageBillAnnualEur: number
}
export interface Club {
  readonly id: ClubId
  readonly name: string
  readonly country: string
  readonly historicalPrestige: number
  readonly currentReputation: number
  readonly sportingAttractiveness: number
  readonly finances: ClubFinances
}
