import { Kysely } from 'kysely';
import CapacitorSQLiteKyselyDialect from 'capacitor-sqlite-kysely';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type { Database } from 'src/types/db';

let db: Kysely<Database> | undefined;
const DB_NAME = 'groovio';
const DB_VERSION = 1;
const DB_ENCRYPTED = false;
const DB_MODE = 'no-encryption';
const DB_READONLY = false;

export const getDbInstance = async () => {
  if (db) return db;

  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await ensureConnection(sqlite);

  db = new Kysely<Database>({
    dialect: new CapacitorSQLiteKyselyDialect(sqlite, { name: DB_NAME }),
  });

  return db;
};

const ensureConnection = async (sqlite: SQLiteConnection) => {
  const { result } = await sqlite.isConnection(DB_NAME, DB_READONLY);

  let connection: SQLiteDBConnection;
  if (!result) {
    // Create NEW connection with all required params
    connection = await sqlite.createConnection(
      DB_NAME,
      DB_ENCRYPTED,
      DB_MODE,
      DB_VERSION,
      DB_READONLY,
    );
  } else {
    // Retrieve existing one
    connection = await sqlite.retrieveConnection(DB_NAME, DB_READONLY);
  }

  await connection.open();

  return connection;
};

export const destroyDbInstance = async () => {
  if (db) {
    await db.destroy();
  }
};
