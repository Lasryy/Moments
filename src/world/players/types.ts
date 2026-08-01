import type { ClubId, PlayerId } from '../../core/ids/types'

export const NATIONALITIES = [
  'France',
  'Angleterre',
  'Espagne',
  'Allemagne',
  'Italie',
  'Portugal',
  'Pays-Bas',
  'Belgique',
  'Croatie',
  'Serbie',
  'Turquie',
  'Brésil',
  'Argentine',
  'Uruguay',
  'Colombie',
  'Maroc',
  'Sénégal',
  'Nigeria',
  'Ghana',
  'Côte d’Ivoire',
  'Cameroun',
  'Japon',
  'Corée du Sud',
  'Mexique',
  'États-Unis',
] as const
export type Nationality = (typeof NATIONALITIES)[number]
export type Position =
  'GK' | 'RB' | 'CB' | 'LB' | 'DM' | 'CM' | 'AM' | 'RW' | 'LW' | 'ST'
export type StrongFoot = 'left' | 'right' | 'both'
export type CareerCurve =
  | 'steady'
  | 'early-prodigy'
  | 'late-bloomer'
  | 'exponential'
  | 'short-peak'
  | 'early-decline'
  | 'perennial-prospect'
  | 'stable'
  | 'renaissance'
  | 'chaotic'
  | 'exceptional-longevity'
  | 'sporting-collapse'
export interface PlayerIdentity {
  readonly id: PlayerId
  readonly firstName: string
  readonly lastName: string
  readonly displayName: string
  readonly nationality: Nationality
  readonly birthYear: number
}
export interface PlayerAttributes {
  readonly pace: number
  readonly shooting: number
  readonly passing: number
  readonly dribbling: number
  readonly defending: number
  readonly physical: number
  readonly goalkeeping?: number
}
export interface HiddenPlayerTraits {
  readonly professionalism: number
  readonly consistency: number
  readonly pressureHandling: number
  readonly injuryProneness: number
  readonly ambition: number
  readonly loyalty: number
}
export interface DevelopmentProfile {
  readonly curve: CareerCurve
  readonly potentialCeiling: number
  readonly peakAge: number
  readonly volatility: number
}
export interface Contract {
  readonly clubId: ClubId
  readonly startSeasonYear: number
  readonly endSeasonYear: number
  readonly salaryAnnualEur: number
  readonly bonusesAnnualEur: number
  readonly squadRole:
    'prospect' | 'rotation' | 'starter' | 'key-player' | 'star'
}
export interface WorldPlayer {
  readonly identity: PlayerIdentity
  readonly positions: readonly Position[]
  readonly strongFoot: StrongFoot
  readonly attributes: PlayerAttributes
  readonly hiddenTraits: HiddenPlayerTraits
  readonly development: DevelopmentProfile
  readonly clubId: ClubId | null
  readonly contract: Contract | null
  readonly careerPlayerId: PlayerId
}
