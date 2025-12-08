import { Kysely } from 'kysely';
import CapacitorSQLiteKyselyDialect from 'capacitor-sqlite-kysely';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { Database } from 'src/types/db';

export const initDb = () => {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  return new Kysely<Database>({
    dialect: new CapacitorSQLiteKyselyDialect(sqlite, { name: 'groovio' }),
  });
};
