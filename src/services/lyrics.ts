import { localPreferences } from '../database';

import { Track } from '../types/music';
import { LyricLine, parseLrc } from '../utils/lyrics';

export type Lyrics = { kind: 'synced' | 'instrumental' | 'unsynced' | 'unavailable'; lines: LyricLine[]; plainText?: string; provider?: 'LRCLIB' };
type Record = { trackName?: unknown; artistName?: unknown; syncedLyrics?: unknown; instrumental?: unknown; plainLyrics?: unknown };
const normalize = (text: string) => text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export async function loadLyrics(track: Track, duration: number, signal: AbortSignal, refresh = false): Promise<Lyrics> {
  if (track.syncedLyrics) {
    const lines = parseLrc(track.syncedLyrics);
    if (lines.length) return { kind: 'synced', lines };
  }
  if (!track.artist.trim() || normalize(track.artist) === 'unknown artist' || !track.title.trim()) return { kind: 'unavailable', lines: [] };
  const key = `groovio.lyrics.v1:${encodeURIComponent(JSON.stringify([track.title, track.artist, track.album ?? '', Math.round(duration)]))}`;
  let cached: { fetchedAt: number; lyrics: Lyrics } | undefined;
  try {
    const raw = await localPreferences.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (['synced', 'instrumental', 'unsynced', 'unavailable'].includes(parsed.lyrics?.kind) && Array.isArray(parsed.lyrics.lines) && parsed.lyrics.lines.every((line: LyricLine) => Number.isFinite(line.time) && typeof line.text === 'string')) cached = parsed;
    }
  } catch { /* A failed cache read must not prevent online lyrics. */ }
  const ttl = cached?.lyrics.kind === 'unavailable' ? 5 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  if (!refresh && cached && Date.now() - cached.fetchedAt < ttl && (cached.lyrics.kind !== 'unsynced' || typeof cached.lyrics.plainText === 'string')) return cached.lyrics;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(cancel, 10000);
  try {
    const params = new URLSearchParams({ track_name: track.title, artist_name: track.artist, album_name: track.album ?? '', duration: String(Math.round(duration)) });
    const response = await fetch(`https://lrclib.net/api/get?${params}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok && response.status !== 404) throw new Error('Could not load lyrics.');
    const result: Record | undefined = response.status === 404 ? undefined : await response.json();
    const matches = typeof result?.trackName === 'string' && typeof result.artistName === 'string' && normalize(result.trackName) === normalize(track.title) && normalize(result.artistName) === normalize(track.artist);
    const lines = matches && typeof result?.syncedLyrics === 'string' ? parseLrc(result.syncedLyrics) : [];
    const lyrics: Lyrics = { kind: !matches ? 'unavailable' : result?.instrumental ? 'instrumental' : lines.length ? 'synced' : result?.plainLyrics ? 'unsynced' : 'unavailable', lines, plainText: matches && typeof result?.plainLyrics === 'string' ? result.plainLyrics : undefined, provider: 'LRCLIB' };
    if (!signal.aborted) {
      try { await localPreferences.setItem(key, JSON.stringify({ fetchedAt: Date.now(), lyrics })); } catch { /* Lyrics can still display without an offline cache. */ }
    }
    return lyrics;
  } catch (error) {
    if (!signal.aborted && cached) return cached.lyrics;
    throw error;
  } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
}
