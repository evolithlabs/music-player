import type { Kysely } from 'kysely';
import type { Database } from 'src/types/db';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('tracks')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('name', 'varchar')
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('tracks').execute();
}
