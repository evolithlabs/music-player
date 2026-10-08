import type { Track } from '../types/music';
import type { RepeatMode } from './playback';

export type PlaybackSession = { trackId: string; position: number; queueIds: string[] | null; historyIds: string[]; shuffle: boolean; repeat: RepeatMode; playlistId?: string };

export function parsePlaybackSession(value: string | null): PlaybackSession | null {
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (!session || typeof session.trackId !== 'string' || !session.trackId || !Number.isFinite(session.position)) return null;
    const ids = (items: unknown): string[] => Array.isArray(items) ? items.filter((id): id is string => typeof id === 'string' && !!id) : [];
    const playlist = typeof session.playlistId === 'string' && session.playlistId && Array.isArray(session.queueIds) && session.queueIds.includes(session.trackId) ? { playlistId: session.playlistId } : {};
    return { trackId: session.trackId, position: Math.max(0, session.position), queueIds: Array.isArray(session.queueIds) ? [...new Set(ids(session.queueIds))] : null, historyIds: ids(session.historyIds).slice(-50), shuffle: session.shuffle === true, repeat: session.repeat === 'all' || session.repeat === 'one' ? session.repeat : 'off', ...playlist };
  } catch { return null; }
}

export function restorePlaybackSession(session: PlaybackSession | null, tracks: readonly Track[]): PlaybackSession | null {
  if (!session) return null;
  const available = new Map(tracks.filter((track) => track.fileState !== 'missing').map((track) => [track.id, track]));
  const track = available.get(session.trackId);
  if (!track) return null;
  return { ...session, position: track.durationMs && track.durationMs > 0 ? Math.min(session.position, track.durationMs / 1000) : session.position, queueIds: session.queueIds?.filter((id) => available.has(id)) ?? null, historyIds: session.historyIds.filter((id) => available.has(id)) };
}
