import { openDB, type IDBPDatabase } from 'idb'
import type { VersionedSave } from '../core/serialization/versionedSave'
const DATABASE_NAME = 'moments'
const DATABASE_VERSION = 1
const SAVES_STORE = 'saves'
interface MomentsDatabase {
  saves: { key: string; value: VersionedSave }
}
const getDatabase = (): Promise<IDBPDatabase<MomentsDatabase>> =>
  openDB<MomentsDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      database.createObjectStore(SAVES_STORE)
    },
  })
export const saveGame = async (
  slotId: string,
  save: VersionedSave,
): Promise<void> => {
  const database = await getDatabase()
  await database.put(SAVES_STORE, save, slotId)
}
export const loadGame = async (
  slotId: string,
): Promise<VersionedSave | undefined> => {
  const database = await getDatabase()
  return database.get(SAVES_STORE, slotId)
}
