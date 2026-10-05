import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import { migrations } from './migrations';
import type { LocalDatabase } from './types';
import { createRepository } from './repository';

export async function createDatabase(): Promise<LocalDatabase> {
  const sqlite = openDatabaseSync('groovio.db');
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (const migration of migrations) if (migration.version > version) {
    sqlite.withTransactionSync(() => { sqlite.execSync(migration.sql); sqlite.execSync(`PRAGMA user_version = ${migration.version}`); });
  }
  const db = drizzle(sqlite, { schema });
  return createRepository(db);
}
