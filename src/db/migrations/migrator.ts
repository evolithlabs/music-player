import { type Kysely, Migrator, type Migration, type MigrationProvider } from 'kysely';
import type { QVueGlobals } from 'quasar';
import type { Database } from 'src/types/db';

class BrowserMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    // adjust this path to wherever your migrations are located
    const migrations = import.meta.glob<Migration>('./*.migration.ts');

    const result: Record<string, Migration> = {};

    for (const [path, migration] of Object.entries(migrations)) {
      const name = path.substring(path.lastIndexOf('/') + 1, path.indexOf('.migration.ts'));

      result[name] = await migration();
    }

    return result;
  }
}

export async function migrate(db: Kysely<Database>, $q: QVueGlobals) {
  const migrator = new Migrator({
    db,
    provider: new BrowserMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    $q.notify({
      type: 'negative',
      message: 'Oops - DB Migration error',
      caption: (error as Error).message,
    });
  }

  if (results) {
    for (const r of results) {
      if (r.status === 'Error') {
        $q.notify({
          type: 'negative',
          message: 'Oops - DB Migration error',
          caption: `Migration ${r.migrationName} Failed`,
        });
      }
    }
  }
}
