import { describe, expect, it } from 'vitest'
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  deserializeVersionedSave,
  serializeVersionedSave,
} from '../core/serialization/versionedSave'
describe('versioned save serialization', () => {
  it('round-trips a minimally valid versioned state', () => {
    const save = {
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      worldSeed: 'world-42',
      savedAtIso: '2030-08-01T12:00:00.000Z',
      state: { currentSeasonStartYear: 2030 },
    } as const
    expect(deserializeVersionedSave(serializeVersionedSave(save))).toEqual(save)
  })
})
