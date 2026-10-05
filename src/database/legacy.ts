import type { LocalDatabase } from './types';
import type { Playlist } from '../types/collection';
import type { Track } from '../types/music';

type LegacyStorage = { getAllKeys(): Promise<readonly string[]>; multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]> };
export async function migrateLegacy(db: LocalDatabase, storage: LegacyStorage) {
  if (await db.getSetting('legacy-migrated.v1')) return;
  const raw = new Map(await storage.multiGet(await storage.getAllKeys()));
  const parse = (key: string) => { const value = raw.get(key); return value ? JSON.parse(value) : []; };
  const songs = parse('music-player.library.v1');
  if (Array.isArray(songs)) await db.saveSongs(songs.filter((song): song is Track => typeof song?.id === 'string' && typeof song?.uri === 'string' && typeof song?.title === 'string' && typeof song?.artist === 'string' && (song.origin === 'local' || song.origin === 'service')).map((song, index) => ({ ...song, addedAt: song.addedAt ?? Date.now() - songs.length + index })));
  const playlists = parse('groovio.playlists.v1');
  if (Array.isArray(playlists)) await db.savePlaylists(playlists.filter((item): item is Playlist => typeof item?.id === 'string' && typeof item?.name === 'string' && Array.isArray(item?.trackIds) && item.trackIds.every((id: unknown) => typeof id === 'string')));
  const queue = parse('groovio.downloads.v1');
  if (Array.isArray(queue)) await db.saveDownloads(queue.filter((entry) => typeof entry?.serviceUrl === 'string' && typeof entry?.job?.id === 'string' && typeof entry?.job?.status === 'string' && typeof entry?.transfer === 'string').map((entry, index) => ({ ...entry, queuedAt: entry.queuedAt ?? Date.now() - index })));
  const recent = parse('groovio.recently-played.v1');
  if (Array.isArray(recent)) for (const [index, id] of [...new Set(recent.filter((id) => typeof id === 'string'))].entries()) await db.saveListeningEvent({ id: `legacy:${id}`, songId: id, startedAt: Date.now() - index * 1000, heardSeconds: 0, position: 0, completed: false });
  for (const [key, value] of raw) if (value && (key.startsWith('groovio.lyrics.') || ['music-player.theme.v1', 'groovio.equalizer.v1', 'groovio.service-url'].includes(key))) await db.setSetting(key, value);
  // Mark only after every collection succeeds; retries are idempotent. Keep recovery copies.
  await db.setSetting('legacy-migrated.v1', '1');
}
