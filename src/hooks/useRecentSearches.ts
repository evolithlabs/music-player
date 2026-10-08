import { useCallback, useEffect, useRef, useState } from 'react';

import { localPreferences } from '../database';
import { mergeSearchHistory, parseSearchHistory, RecentSearchSong, stableSearchHistory } from '../utils/search-history';

const key = 'groovio.selected-search-songs';

export function useRecentSearches() {
  const [songs, setSongs] = useState<RecentSearchSong[]>([]);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<RecentSearchSong[]>([]);
  const ready = useRef(false);
  const persist = useCallback((items: RecentSearchSong[]) => {
    void localPreferences.setItem(key, JSON.stringify(items)).catch(() => setError('Could not save recent searches.'));
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([localPreferences.getItem(key), localPreferences.getItem('groovio.recent-search-songs')]).then(([value, previous]) => {
      if (!active) return;
      const changed = current.current.length > 0;
      // The old cache also contained unselected results; only track IDs prove a selection.
      const stored = value === null ? parseSearchHistory(previous).filter((song) => song.trackId) : parseSearchHistory(value);
      current.current = mergeSearchHistory(current.current, stored);
      ready.current = true;
      setSongs(current.current);
      if (changed || value === null) persist(current.current);
    }).catch(() => { if (active) { ready.current = true; setError('Could not restore recent searches.'); } });
    return () => { active = false; };
  }, [persist]);
  const remember = useCallback((latest: RecentSearchSong[]) => {
    if (!latest.length) return;
    current.current = mergeSearchHistory(latest, current.current);
    // Persist newest-first history, but keep the visible rows in place while playing.
    setSongs((visible) => stableSearchHistory(visible, current.current));
    if (ready.current) persist(current.current);
  }, [persist]);
  const refresh = useCallback(() => setSongs(current.current), []);
  return { songs, remember, refresh, error };
}
