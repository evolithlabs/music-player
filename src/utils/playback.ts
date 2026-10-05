import type { Track } from '../types/music';

export type RepeatMode = 'off' | 'all' | 'one';

export function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function nextTrack(tracks: readonly Track[], selectedId: string | null, shuffle: boolean, repeat: RepeatMode, random = Math.random): Track | undefined {
  const index = tracks.findIndex((track) => track.id === selectedId);
  if (index < 0) return undefined;
  if (shuffle && tracks.length > 1) {
    const candidates = tracks.filter((track) => track.id !== selectedId);
    return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
  }
  return tracks[index + 1] ?? (repeat === 'all' ? tracks[0] : undefined);
}
