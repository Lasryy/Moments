export interface NormalizedPoint {
  readonly x: number
  readonly y: number
}
export interface ShotInput {
  readonly normalizedDirectionX: number
  readonly normalizedDirectionY: number
  readonly normalizedPower: number
  readonly releaseTiming: number
}
export type PreferredFoot = 'left' | 'right'
export type ShotOutcome = 'goal' | 'saved' | 'blocked' | 'post' | 'off-target'
export type SportingConsequenceHint =
  | 'major-positive'
  | 'minor-positive'
  | 'neutral'
  | 'minor-negative'
  | 'major-negative'
export interface ShotWeights {
  readonly humanExecution: number
  readonly playerAbility: number
  readonly context: number
}
export interface ShotPlayerProfile {
  readonly shooting: number
  readonly pressureHandling: number
  readonly preferredFoot: PreferredFoot
  readonly usedFoot: PreferredFoot
  readonly weakFootPenalty: number
}
export interface ShotContext {
  readonly fatigue: number
  readonly pressure: number
  readonly angleDifficulty: number
  readonly distance: number
  readonly defenderCount: number
  readonly matchImportance: number
  readonly goalkeeperCoversNearPost: boolean
}
export interface ShotScenario {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly defaultPlayer: ShotPlayerProfile
  readonly context: ShotContext
  readonly targetGuide: NormalizedPoint
}
export interface GoalkeeperDecision {
  readonly diveDirection: 'left' | 'right' | 'stay'
  readonly anticipationScore: number
  readonly reachesBall: boolean
}
export interface ShotResolution {
  readonly outcome: ShotOutcome
  readonly humanExecutionScore: number
  readonly playerAbilityScore: number
  readonly contextScore: number
  readonly finalShotQuality: number
  readonly targetPosition: NormalizedPoint
  readonly actualBallDestination: NormalizedPoint
  readonly goalkeeperDecision: GoalkeeperDecision
  readonly consequenceHint: SportingConsequenceHint
  readonly explanation: readonly string[]
}
export interface ResolveShotRequest {
  readonly simulationVersion: string
  readonly seed: string
  readonly scenario: ShotScenario
  readonly player: ShotPlayerProfile
  readonly input: ShotInput
  readonly weights?: ShotWeights
}
