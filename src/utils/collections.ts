import type { Track } from '../types/music';

export type MusicGroup = { id: string; name: string; artist?: string; tracks: Track[] };
export function groupTracks(tracks: readonly Track[], kind: 'artist' | 'album'): MusicGroup[] {
  const groups = new Map<string, MusicGroup>();
  for (const track of tracks) {
    const name = kind === 'artist' ? track.artist : track.album;
    if (!name) continue;
    const id = JSON.stringify(kind === 'album' ? [name, track.artist] : [name]);
    const group = groups.get(id) ?? { id, name, artist: kind === 'album' ? track.artist : undefined, tracks: [] };
    group.tracks.push(track); groups.set(id, group);
  }
  return [...groups.values()];
}

export function rememberTrack(ids: readonly string[], id: string, limit = 30): string[] {
  return [id, ...ids.filter((value) => value !== id)].slice(0, limit);
}
