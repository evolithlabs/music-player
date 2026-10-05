import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { localPreferences } from '../database';
import { parsePlaybackSession, PlaybackSession } from '../utils/playback-session';

const key = 'groovio.playback-session';

export function usePlaybackSession() {
  const [saved, setSaved] = useState<PlaybackSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<PlaybackSession | null>(null);
  const lastWrite = useRef<{ identity: string; position: number; playing: boolean } | undefined>(undefined);
  const persist = useCallback(() => {
    if (!current.current) return;
    void localPreferences.setItem(key, JSON.stringify(current.current)).then(() => setError(null)).catch(() => setError('Could not save your playback position.'));
  }, []);
  useEffect(() => {
    let active = true;
    void localPreferences.getItem(key).then((value) => { if (active) { setSaved(parsePlaybackSession(value)); setReady(true); } }).catch(() => { if (active) { setError('Could not restore your last playback.'); setReady(true); } });
    return () => { active = false; };
  }, []);
  const remember = useCallback((session: PlaybackSession, playing: boolean) => {
    current.current = session;
    const identity = JSON.stringify({ ...session, position: 0 });
    const previous = lastWrite.current;
    if (!previous || previous.identity !== identity || previous.playing !== playing || Math.abs(previous.position - session.position) >= 1) {
      lastWrite.current = { identity, position: session.position, playing };
      persist();
    }
  }, [persist]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') persist(); });
    if (Platform.OS === 'web') window.addEventListener('pagehide', persist);
    return () => { subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('pagehide', persist); persist(); };
  }, [persist]);
  return { saved, ready, error, remember };
}
