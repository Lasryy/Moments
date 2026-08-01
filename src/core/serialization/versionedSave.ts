import { z } from 'zod'
export const CURRENT_SAVE_SCHEMA_VERSION = 1
export const VersionedSaveSchema = z.object({
  schemaVersion: z.literal(CURRENT_SAVE_SCHEMA_VERSION),
  worldSeed: z.string().min(1),
  savedAtIso: z.string().datetime(),
  state: z.unknown(),
})
export type VersionedSave = z.infer<typeof VersionedSaveSchema>
export const serializeVersionedSave = (save: VersionedSave): string =>
  JSON.stringify(VersionedSaveSchema.parse(save))
export const deserializeVersionedSave = (serialized: string): VersionedSave =>
  VersionedSaveSchema.parse(JSON.parse(serialized))
