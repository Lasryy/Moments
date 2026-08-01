export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name
}
export type PlayerId = Brand<string, 'PlayerId'>
export type ClubId = Brand<string, 'ClubId'>
export type EventId = Brand<string, 'EventId'>
export type SeasonId = Brand<string, 'SeasonId'>
export const asPlayerId = (value: string): PlayerId => value as PlayerId
export const asClubId = (value: string): ClubId => value as ClubId
export const asEventId = (value: string): EventId => value as EventId
export const asSeasonId = (value: string): SeasonId => value as SeasonId
