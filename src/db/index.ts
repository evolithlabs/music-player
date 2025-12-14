import { Kysely, ParseJSONResultsPlugin } from 'kysely';
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

let initPromise: Promise<Kysely<Database>> | null = null; // Lock variable

export const getDbInstance = async () => {
  if (db) return db;

  // If an initialization is already in progress, wait for it
  if (initPromise) return initPromise;

  // Create the promise and store it
  initPromise = (async () => {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    await ensureConnection(sqlite);

    db = new Kysely<Database>({
      dialect: new CapacitorSQLiteKyselyDialect(sqlite, { name: DB_NAME }),
      plugins: [new ParseJSONResultsPlugin()],
    });

    return db;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null; // Clear lock after finish
  }
};

const ensureConnection = async (sqlite: SQLiteConnection) => {
  // Check consistency first (Crucial for Capacitor)
  await sqlite.checkConnectionsConsistency();

  const { result } = await sqlite.isConnection(DB_NAME, DB_READONLY);

  let connection: SQLiteDBConnection;
  if (!result) {
    connection = await sqlite.createConnection(
      DB_NAME,
      DB_ENCRYPTED,
      DB_MODE,
      DB_VERSION,
      DB_READONLY,
    );
  } else {
    connection = await sqlite.retrieveConnection(DB_NAME, DB_READONLY);
  }

  // Check if open before opening
  const isConnected = await connection.isDBOpen();
  if (!isConnected.result) {
    await connection.open();
  }

  return connection;
};

export const destroyDbInstance = async () => {
  if (db) {
    await db.destroy();
  }
};
