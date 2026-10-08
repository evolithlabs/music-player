import type { Track } from '../types/music';

export type RepeatMode = 'off' | 'all' | 'one';

export function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function seekTime(position: number, width: number, duration: number): number | undefined {
  if (!Number.isFinite(position) || !Number.isFinite(width) || !Number.isFinite(duration) || width <= 0 || duration <= 0) return undefined;
  return Math.max(0, Math.min(1, position / width)) * duration;
}

export function formatSongArtist(song: Pick<Track, 'artist' | 'durationMs'>, playbackDuration = 0) {
  const seconds = Number.isFinite(playbackDuration) && playbackDuration > 0 ? playbackDuration : (song.durationMs ?? 0) / 1000;
  return Number.isFinite(seconds) && seconds > 0 ? `${song.artist} • ${formatTime(seconds)}` : song.artist;
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

export function upcomingTracks(tracks: readonly Track[], selectedId: string | null, shuffle: boolean, repeat: RepeatMode): Track[] {
  const available = tracks.filter((track) => track.fileState !== 'missing');
  const index = available.findIndex((track) => track.id === selectedId);
  if (index < 0) return [];
  if (shuffle) return available.filter((track) => track.id !== selectedId);
  const following = available.slice(index + 1);
  return repeat === 'all' ? [...following, ...available.slice(0, index)] : following;
}
