import type { ClubId, PlayerId } from '../../core/ids/types'

export type NationalityId =
  | 'france'
  | 'england'
  | 'spain'
  | 'germany'
  | 'italy'
  | 'portugal'
  | 'netherlands'
  | 'belgium'
  | 'croatia'
  | 'serbia'
  | 'turkey'
  | 'brazil'
  | 'argentina'
  | 'uruguay'
  | 'colombia'
  | 'morocco'
  | 'senegal'
  | 'nigeria'
  | 'ghana'
  | 'ivory-coast'
  | 'cameroon'
  | 'japan'
  | 'south-korea'
  | 'mexico'
  | 'united-states'

export interface NationalityMetadata {
  readonly labelFr: string
}

/** Stable IDs are saved and simulated; labels only belong to presentation. */
export const NATIONALITY_METADATA: Readonly<
  Record<NationalityId, NationalityMetadata>
> = {
  france: { labelFr: 'France' },
  england: { labelFr: 'Angleterre' },
  spain: { labelFr: 'Espagne' },
  germany: { labelFr: 'Allemagne' },
  italy: { labelFr: 'Italie' },
  portugal: { labelFr: 'Portugal' },
  netherlands: { labelFr: 'Pays-Bas' },
  belgium: { labelFr: 'Belgique' },
  croatia: { labelFr: 'Croatie' },
  serbia: { labelFr: 'Serbie' },
  turkey: { labelFr: 'Turquie' },
  brazil: { labelFr: 'Brésil' },
  argentina: { labelFr: 'Argentine' },
  uruguay: { labelFr: 'Uruguay' },
  colombia: { labelFr: 'Colombie' },
  morocco: { labelFr: 'Maroc' },
  senegal: { labelFr: 'Sénégal' },
  nigeria: { labelFr: 'Nigeria' },
  ghana: { labelFr: 'Ghana' },
  'ivory-coast': { labelFr: 'Côte d’Ivoire' },
  cameroon: { labelFr: 'Cameroun' },
  japan: { labelFr: 'Japon' },
  'south-korea': { labelFr: 'Corée du Sud' },
  mexico: { labelFr: 'Mexique' },
  'united-states': { labelFr: 'États-Unis' },
}

export type Position =
  'GK' | 'RB' | 'CB' | 'LB' | 'DM' | 'CM' | 'AM' | 'RW' | 'LW' | 'ST'
export type PreferredFoot = 'left' | 'right'
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
  readonly nationality: NationalityId
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
/** identity.id is the sole player identifier in all player-related state. */
export interface WorldPlayer {
  readonly identity: PlayerIdentity
  readonly positions: readonly Position[]
  readonly preferredFoot: PreferredFoot
  readonly attributes: PlayerAttributes
  readonly hiddenTraits: HiddenPlayerTraits
  readonly development: DevelopmentProfile
  readonly clubId: ClubId | null
  readonly contract: Contract | null
}
