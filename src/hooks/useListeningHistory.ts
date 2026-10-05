import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getDatabase, saveListeningEvent } from '../database';
import { ListeningEvent } from '../database/types';
import { rememberTrack } from '../utils/collections';
import { listenedSeconds, ListeningSample } from '../utils/listening';

type Session = { key: string; event: ListeningEvent; sample?: ListeningSample; savedAt: number };
export function useListeningHistory(songId: string | undefined, playerId: string | number, playing: boolean, position: number, finished: boolean) {
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recent = useRef<string[]>([]);
  const session = useRef<Session | undefined>(undefined);
  const persist = useCallback((value: Session) => {
    value.savedAt = Date.now();
    void saveListeningEvent({ ...value.event }).then(() => setError(null)).catch(() => setError('Could not save listening history on this device.'));
  }, []);
  useEffect(() => {
    let active = true;
    void getDatabase().then((db) => db.getRecentSongIds()).then((saved) => {
      if (!active) return;
      recent.current = [...new Set([...recent.current, ...saved])].slice(0, 30);
      setRecentlyPlayed(recent.current);
    }).catch(() => { if (active) setError('Could not open listening history.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const key = `${songId}:${playerId}`;
      let current = session.current;
      if (current && current.key !== key) { persist(current); session.current = current = undefined; }
      if (!songId) return;
      if (!current && playing) {
        const now = Date.now();
        current = { key, savedAt: now, event: { id: `${now}-${Math.random().toString(36).slice(2, 10)}`, songId, startedAt: now, heardSeconds: 0, position, completed: false } };
        session.current = current;
        recent.current = rememberTrack(recent.current, songId); setRecentlyPlayed(recent.current); persist(current);
      }
      if (!current) return;
      const sample = { position, sampledAt: Date.now(), playing };
      current.event.heardSeconds += listenedSeconds(current.sample, sample);
      current.event.position = position;
      const justCompleted = finished && !current.event.completed;
      current.event.completed ||= finished;
      if ((current.sample?.playing && !playing) || justCompleted || sample.sampledAt - current.savedAt >= 10000) persist(current);
      current.sample = sample;
      if (current.event.completed && playing && position < 1 && !finished) { persist(current); session.current = undefined; }
    });
    return () => { cancelled = true; };
  }, [songId, playerId, playing, position, finished, persist]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active' && session.current) persist(session.current); });
    return () => { subscription.remove(); if (session.current) persist(session.current); };
  }, [persist]);
  return { recentlyPlayed, error };
}
