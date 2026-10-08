import type { CatalogTrack } from '../types/music';
import { catalogIdentity } from './catalog.ts';

export type RecentSearchSong = { catalog?: CatalogTrack; trackId?: string };
const limit = 20;
const songIdentity = (song: RecentSearchSong) => song.catalog ? catalogIdentity(song.catalog) : song.trackId;

export function mergeSearchHistory(latest: RecentSearchSong[], previous: RecentSearchSong[]) {
  const songs = new Map<string, RecentSearchSong>();
  for (const song of [...latest, ...previous]) {
    const id = songIdentity(song);
    if (id && !songs.has(id)) songs.set(id, song);
    if (songs.size === limit) break;
  }
  return [...songs.values()];
}

export function stableSearchHistory(visible: RecentSearchSong[], current: RecentSearchSong[]) {
  const saved = new Map(current.map((song) => [songIdentity(song), song]));
  return [...new Set([...visible, ...current].map(songIdentity))].flatMap((id) => saved.has(id) ? [saved.get(id)!] : []);
}

export function parseSearchHistory(value: string | null): RecentSearchSong[] {
  if (!value) return [];
  try {
    const songs: unknown = JSON.parse(value);
    if (!Array.isArray(songs)) return [];
    return mergeSearchHistory(songs.filter((song): song is RecentSearchSong => {
      if (!song || typeof song !== 'object') return false;
      if (song.catalog) {
        const track = song.catalog;
        return typeof track.recordingId === 'string' && (!!track.recordingId || typeof track.deezerId === 'number' && track.deezerId > 0) && typeof track.title === 'string' && typeof track.artist === 'string' && typeof track.durationMs === 'number';
      }
      return typeof song.trackId === 'string' && !!song.trackId;
    }), []);
  } catch { return []; }
}
