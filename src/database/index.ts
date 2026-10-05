import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDatabase } from './database';
import type { LocalDatabase, ListeningEvent } from './types';
import { migrateLegacy } from './legacy';

let opening: Promise<LocalDatabase> | undefined;
let writes = Promise.resolve();
export function getDatabase() {
  if (!opening) opening = createDatabase().then(async (db) => { await migrateLegacy(db, AsyncStorage); return db; }).catch((error) => { opening = undefined; throw error; });
  return opening;
}
export function writeLocal<T>(operation: (db: LocalDatabase) => Promise<T>): Promise<T> {
  const task = writes.then(async () => operation(await getDatabase()));
  writes = task.then(() => {}, () => {});
  return task;
}
export const localPreferences = {
  async getItem(key: string) { return (await getDatabase()).getSetting(key); },
  setItem(key: string, value: string) { return writeLocal((db) => db.setSetting(key, value)); },
};
export const saveListeningEvent = (event: ListeningEvent) => writeLocal((db) => db.saveListeningEvent(event));
