import { desc, eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema.ts';
import type { LocalDatabase } from './types.ts';

export function createRepository(db: ExpoSQLiteDatabase<typeof schema>): LocalDatabase {
  return {
    async getSetting(key) { return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value ?? null; },
    async setSetting(key, value) { db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } }).run(); },
    async getSongs() { return db.select().from(schema.songs).orderBy(schema.songs.addedAt).all().map((row) => ({ ...row.payload, fileState: row.fileState as 'available' | 'missing', addedAt: row.addedAt })); },
    async saveSongs(songs) { db.transaction((tx) => { for (const song of songs) {
      const row = { id: song.id, title: song.title, artist: song.artist, album: song.album, uri: song.uri, addedAt: song.addedAt ?? Date.now(), fileState: song.fileState ?? 'available', payload: song };
      tx.insert(schema.songs).values(row).onConflictDoUpdate({ target: schema.songs.id, set: row }).run();
    } }); },
    async removeSong(id) { db.transaction((tx) => { tx.delete(schema.playlistSongs).where(eq(schema.playlistSongs.songId, id)).run(); tx.delete(schema.songs).where(eq(schema.songs.id, id)).run(); }); },
    async removeDownloads(jobId) { db.transaction((tx) => { for (const row of tx.select().from(schema.downloads).all()) { if (JSON.parse(row.payload).job.id === jobId) tx.delete(schema.downloads).where(eq(schema.downloads.id, row.id)).run(); } }); },
    async getPlaylists() {
      const links = db.select().from(schema.playlistSongs).orderBy(schema.playlistSongs.position).all();
      return db.select().from(schema.playlists).orderBy(schema.playlists.createdAt).all().map((row) => ({ ...row, trackIds: links.filter((link) => link.playlistId === row.id).map((link) => link.songId) }));
    },
    async savePlaylists(items) { db.transaction((tx) => { for (const item of items) {
      const row = { id: item.id, name: item.name, createdAt: item.createdAt };
      tx.insert(schema.playlists).values(row).onConflictDoUpdate({ target: schema.playlists.id, set: row }).run();
      tx.delete(schema.playlistSongs).where(eq(schema.playlistSongs.playlistId, item.id)).run();
      item.trackIds.forEach((songId, position) => tx.insert(schema.playlistSongs).values({ playlistId: item.id, songId, position }).onConflictDoNothing().run());
    } }); },
    async removePlaylist(id) { db.transaction((tx) => { tx.delete(schema.playlistSongs).where(eq(schema.playlistSongs.playlistId, id)).run(); tx.delete(schema.playlists).where(eq(schema.playlists.id, id)).run(); }); },
    async getDownloads<T>() { return db.select().from(schema.downloads).all().map((row) => JSON.parse(row.payload) as T); },
    async saveDownloads(entries) { db.transaction((tx) => { for (const entry of entries) {
      const row = { id: `${entry.serviceUrl}:${entry.job.id}`, serviceUrl: entry.serviceUrl, status: entry.job.status, transfer: entry.transfer, payload: JSON.stringify(entry) };
      tx.insert(schema.downloads).values(row).onConflictDoUpdate({ target: schema.downloads.id, set: row }).run();
    } }); },
    async saveListeningEvent(event) { db.insert(schema.listeningEvents).values(event).onConflictDoUpdate({ target: schema.listeningEvents.id, set: { heardSeconds: sql`max(heard_seconds, ${event.heardSeconds})`, position: event.position, completed: sql`max(completed, ${event.completed ? 1 : 0})` } }).run(); },
    async getRecentSongIds() { return db.select({ songId: schema.listeningEvents.songId }).from(schema.listeningEvents).groupBy(schema.listeningEvents.songId).orderBy(desc(sql`max(started_at)`)).limit(30).all().map((row) => row.songId); },
    async getListeningStats() { return db.select({ plays: sql<number>`count(*)`, heardSeconds: sql<number>`coalesce(sum(heard_seconds), 0)`, completed: sql<number>`coalesce(sum(completed), 0)` }).from(schema.listeningEvents).where(sql`${schema.listeningEvents.id} not like ${'legacy:%'}`).get()!; },
  };
}
