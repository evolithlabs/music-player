import { useEffect, useState } from 'react';

import { loadLyrics, Lyrics } from '../services/lyrics';
import { Track } from '../types/music';

export function useLyrics(track: Track | undefined, duration: number) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; lyrics?: Lyrics; failed?: boolean }>();
  const seconds = Math.round(duration || (track?.durationMs ?? 0) / 1000);
  const key = JSON.stringify([track?.id, track?.title, track?.artist, track?.album, track?.syncedLyrics, seconds, attempt]);
  useEffect(() => {
    if (!track || (!seconds && !track.syncedLyrics)) return;
    const controller = new AbortController();
    void loadLyrics(track, seconds, controller.signal, attempt > 0).then((lyrics) => {
      if (!controller.signal.aborted) setResult({ key, lyrics });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, failed: true });
    });
    return () => controller.abort();
  }, [key, track, seconds, attempt]);
  return { lyrics: result?.key === key ? result.lyrics : undefined, failed: result?.key === key && !!result.failed, retry: () => setAttempt((value) => value + 1) };
}
