import { describe, expect, it } from 'vitest'
import { asPlayerId } from '../../core/ids/types'
import { NATIONALITY_METADATA } from '../../world/players/types'
import type { WorldPlayer } from '../../world/players/types'

describe('player identity foundations', () => {
  it('uses stable nationality IDs with French display metadata', () => {
    expect(NATIONALITY_METADATA.france.labelFr).toBe('France')
    expect(NATIONALITY_METADATA['ivory-coast'].labelFr).toBe('Côte d’Ivoire')
    expect(Object.keys(NATIONALITY_METADATA)).toHaveLength(25)
  })
  it('keeps identity.id as the only player identity and uses a binary preferred foot', () => {
    const player: WorldPlayer = {
      identity: {
        id: asPlayerId('player:1'),
        firstName: 'Test',
        lastName: 'Player',
        displayName: 'Test Player',
        nationality: 'france',
        birthYear: 2000,
      },
      positions: ['ST'],
      preferredFoot: 'left',
      attributes: {
        pace: 70,
        shooting: 70,
        passing: 70,
        dribbling: 70,
        defending: 20,
        physical: 70,
      },
      hiddenTraits: {
        professionalism: 70,
        consistency: 70,
        pressureHandling: 70,
        injuryProneness: 30,
        ambition: 70,
        loyalty: 70,
      },
      development: {
        curve: 'steady',
        potentialCeiling: 80,
        peakAge: 27,
        volatility: 20,
      },
      clubId: null,
      contract: null,
    }
    expect('careerPlayerId' in player).toBe(false)
    expect(player.preferredFoot).toBe('left')
  })
})
