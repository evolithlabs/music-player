import { Track } from '../types/music';
import { Playlist } from '../types/collection';
import { ListeningEvent, LocalDatabase, StoredDownload } from './types';

// IndexedDB keeps the browser preview local without experimental SQLite/WASM headers.
export async function createDatabase(): Promise<LocalDatabase> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('groovio', 2);
    request.onupgradeneeded = () => {
      for (const name of ['songs', 'playlists', 'playlist_songs', 'listening_events', 'downloads', 'settings', 'files']) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: name === 'settings' || name === 'files' ? 'key' : 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const all = <T,>(name: string) => new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(name, 'readonly').objectStore(name).getAll();
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const get = <T,>(name: string, key: string) => new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(name, 'readonly').objectStore(name).get(key);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  db.onversionchange = () => db.close();
  const write = (names: string[], action: (transaction: IDBTransaction) => void) => new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(names, 'readwrite');
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error('Database transaction was cancelled.'));
    try { action(transaction); } catch (error) { transaction.abort(); reject(error); }
  });
  return {
    async getFile(key) { return (await get<{ data: Blob }>('files', key))?.data; },
    async saveFile(key, data) { await write(['files'], (tx) => tx.objectStore('files').put({ key, data })); },
    async removeFile(key) { await write(['files'], (tx) => tx.objectStore('files').delete(key)); },
    async getSetting(key) { return (await get<{ value: string }>('settings', key))?.value ?? null; },
    async setSetting(key, value) { await write(['settings'], (tx) => tx.objectStore('settings').put({ key, value })); },
    async getSongs() { return (await all<Track>('songs')).sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0)); },
    async saveSongs(songs) { await write(['songs'], (tx) => songs.forEach((song) => tx.objectStore('songs').put({ ...song, addedAt: song.addedAt ?? Date.now(), fileState: song.fileState ?? 'available' }))); },
    async removeSong(id) {
      const links = await all<{ id: string; songId: string }>('playlist_songs');
      await write(['songs', 'playlist_songs'], (tx) => {
        links.filter((link) => link.songId === id).forEach((link) => tx.objectStore('playlist_songs').delete(link.id));
        tx.objectStore('songs').delete(id);
      });
    },
    async removeDownloads(jobId) {
      const entries = await all<StoredDownload & { id: string }>('downloads');
      await write(['downloads'], (tx) => entries.filter((entry) => entry.job.id === jobId).forEach((entry) => tx.objectStore('downloads').delete(entry.id)));
    },
    async getPlaylists() {
      const rows = await all<Playlist>('playlists');
      const links = await all<{ playlistId: string; songId: string; position: number }>('playlist_songs');
      return rows.sort((a, b) => a.createdAt-b.createdAt).map((row) => ({ id: row.id, name: row.name, createdAt: row.createdAt, trackIds: links.filter((link) => link.playlistId === row.id).sort((a,b) => a.position-b.position).map((link) => link.songId) }));
    },
    async savePlaylists(items) {
      const previous = await all<{ id: string; playlistId: string }>('playlist_songs');
      await write(['playlists', 'playlist_songs'], (tx) => {
        for (const item of items) {
          tx.objectStore('playlists').put({ id: item.id, name: item.name, createdAt: item.createdAt });
          previous.filter((link) => link.playlistId === item.id).forEach((link) => tx.objectStore('playlist_songs').delete(link.id));
          [...new Set(item.trackIds)].forEach((songId, position) => tx.objectStore('playlist_songs').put({ id: JSON.stringify([item.id, songId]), playlistId: item.id, songId, position }));
        }
      });
    },
    async removePlaylist(id) {
      const links = await all<{ id: string; playlistId: string }>('playlist_songs');
      await write(['playlists', 'playlist_songs'], (tx) => {
        links.filter((link) => link.playlistId === id).forEach((link) => tx.objectStore('playlist_songs').delete(link.id));
        tx.objectStore('playlists').delete(id);
      });
    },
    getDownloads: <T,>() => all<T>('downloads'),
    async saveDownloads(entries: StoredDownload[]) { await write(['downloads'], (tx) => entries.forEach((entry) => tx.objectStore('downloads').put({ ...entry, id: `${entry.serviceUrl}:${entry.job.id}` }))); },
    async saveListeningEvent(event) { await write(['listening_events'], (tx) => {
      const store = tx.objectStore('listening_events'), request = store.get(event.id);
      request.onsuccess = () => store.put({ ...event, heardSeconds: Math.max(request.result?.heardSeconds ?? 0, event.heardSeconds), completed: !!request.result?.completed || event.completed });
    }); },
    async getRecentSongIds() { return [...new Set((await all<ListeningEvent>('listening_events')).sort((a,b) => b.startedAt-a.startedAt).map((event) => event.songId))].slice(0,30); },
    async getListeningStats() { const events = (await all<ListeningEvent>('listening_events')).filter((event) => !event.id.startsWith('legacy:')); return { plays: events.length, heardSeconds: events.reduce((sum, event) => sum+event.heardSeconds,0), completed: events.filter((event) => event.completed).length }; },
  };
}
