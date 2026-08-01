import type { PlayerId, SeasonId } from '../../core/ids/types'
export type AwardKind =
  | 'ballon-dor'
  | 'golden-shoe'
  | 'yashin'
  | 'best-young-player'
  | 'national'
  | 'competition'
  | 'team-of-season'
export interface AwardRecord {
  readonly award: AwardKind
  readonly recipientPlayerId: PlayerId
  readonly seasonId: SeasonId
  readonly placement?: number
}
