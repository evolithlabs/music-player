import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { localPreferences } from '../database';
import { DirectSelection, parseSelections, rankQuickPicks, selectionWindow } from '../utils/quick-picks';

const key = 'groovio.direct-song-selections';
export function useQuickPicks() {
  const current = useRef<DirectSelection[]>([]);
  const ready = useRef(false);
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const persist = useCallback(() => {
    void localPreferences.setItem(key, JSON.stringify(current.current)).catch(() => setError('Could not save Quick Picks.'));
  }, []);
  useEffect(() => {
    let active = true;
    void localPreferences.getItem(key).then((value) => {
      if (!active) return;
      const pending = current.current;
      current.current = [...parseSelections(value), ...pending]; ready.current = true;
      setIds(rankQuickPicks(current.current));
      if (pending.length) persist();
    }).catch(() => { if (active) { ready.current = true; setError('Could not restore Quick Picks.'); } });
    const refresh = () => { if (active) setIds(rankQuickPicks(current.current)); };
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [persist]);
  const record = useCallback((songId: string) => {
    const now = Date.now();
    current.current = [...current.current.filter((item) => item.selectedAt >= now - selectionWindow), { songId, selectedAt: now }];
    setIds(rankQuickPicks(current.current, now));
    if (ready.current) persist();
  }, [persist]);
  return { ids, record, error };
}
