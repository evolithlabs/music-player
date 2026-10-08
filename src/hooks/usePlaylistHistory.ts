import { useCallback, useEffect, useRef, useState } from 'react';

import { localPreferences } from '../database';
import { mergePlaylistHistory, parsePlaylistHistory } from '../utils/playlist-history';

const key = 'groovio.playlist-listening-history';

export function usePlaylistHistory(playlistId: string | undefined, songId: string | undefined, playerId: string | number, playing: boolean) {
  const current = useRef<string[]>([]);
  const ready = useRef(false);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persist = useCallback(() => {
    const value = JSON.stringify(current.current);
    pending.current = pending.current.catch(() => {}).then(() => localPreferences.setItem(key, value)).then(() => setError(null)).catch(() => setError('Could not save playlist listening history.'));
  }, []);
  useEffect(() => {
    let active = true;
    void localPreferences.getItem(key).then((value) => {
      if (!active) return;
      const hasPending = current.current.length > 0;
      current.current = mergePlaylistHistory(current.current, parsePlaylistHistory(value));
      ready.current = true; setLoaded(true); setIds(current.current);
      if (hasPending) persist();
    }).catch(() => { if (active) { ready.current = true; setLoaded(true); setError('Could not restore playlist listening history.'); } });
    return () => { active = false; };
  }, [persist]);
  useEffect(() => {
    if (!playing || !playlistId || !songId) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      current.current = mergePlaylistHistory([playlistId], current.current);
      setIds(current.current);
      if (ready.current) persist();
    });
    return () => { cancelled = true; };
  }, [playlistId, songId, playerId, playing, persist]);
  return { ids, ready: loaded, error };
}
