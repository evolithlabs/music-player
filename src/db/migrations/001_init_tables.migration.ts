import type { Kysely } from 'kysely';
import type { Database } from 'src/types/db';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('albums')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar')
    .addColumn('cover_path', 'varchar')
    .addColumn('spotify_id', 'varchar', (col) => col.unique())
    .execute();

  await db.schema
    .createTable('artists')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar')
    .addColumn('spotify_id', 'varchar', (col) => col.unique())
    .execute();

  await db.schema
    .createTable('tracks')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar')
    .addColumn('duration', 'integer')
    .addColumn('path', 'varchar')
    .addColumn('cover_path', 'varchar')
    .addColumn('year', 'varchar')
    .addColumn('spotify_id', 'varchar', (col) => col.unique())
    .addColumn('local_id', 'integer', (col) => col.unique())
    .addColumn('album_id', 'integer', (col) => col.references('albums.id').onDelete('cascade'))
    .execute();

  await db.schema
    .createTable('tracks_artists')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('track_id', 'integer', (col) => col.references('tracks.id').onDelete('cascade'))
    .addColumn('artist_id', 'integer', (col) => col.references('artists.id').onDelete('cascade'))
    .execute();

  await db.schema
    .createTable('albums_artists')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('album_id', 'integer', (col) => col.references('albums.id').onDelete('cascade'))
    .addColumn('artist_id', 'integer', (col) => col.references('artists.id').onDelete('cascade'))
    .execute();

  await db.schema
    .createTable('settings')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('app_is_initialized', 'boolean', (col) => col.defaultTo(false))
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('settings').ifExists().execute();

  await db.schema.dropTable('albums_artists').ifExists().execute();
  await db.schema.dropTable('tracks_artists').ifExists().execute();
  await db.schema.dropTable('artists').ifExists().execute();
  await db.schema.dropTable('albums').ifExists().execute();
  await db.schema.dropTable('tracks').ifExists().execute();
}
