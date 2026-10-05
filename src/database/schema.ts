import { integer, real, sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core';
import type { Track } from '../types/music';

export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(), title: text('title').notNull(), artist: text('artist').notNull(), album: text('album'),
  uri: text('uri').notNull(), addedAt: integer('added_at').notNull(), fileState: text('file_state').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Track>().notNull(),
});
export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(), name: text('name').notNull(), createdAt: integer('created_at').notNull(),
});
export const playlistSongs = sqliteTable('playlist_songs', {
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  songId: text('song_id').notNull(), position: integer('position').notNull(),
}, (table) => [primaryKey({ columns: [table.playlistId, table.songId] })]);
export const listeningEvents = sqliteTable('listening_events', {
  id: text('id').primaryKey(), songId: text('song_id').notNull(), startedAt: integer('started_at').notNull(),
  heardSeconds: real('heard_seconds').notNull(), position: real('position').notNull(), completed: integer('completed', { mode: 'boolean' }).notNull(),
}, (table) => [index('listening_song_date').on(table.songId, table.startedAt)]);
export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(), serviceUrl: text('service_url').notNull(), status: text('status').notNull(), transfer: text('transfer').notNull(), payload: text('payload').notNull(),
});
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
