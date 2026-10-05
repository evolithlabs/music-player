import { setAudioModeAsync } from 'expo-audio';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { reconcileLibrary, saveLibrary } from '../services/library';
import { scanDeviceAudio, watchDeviceAudio } from '../services/device-audio';
import { Track } from '../types/music';
import { mergeDeviceLibrary } from '../utils/device-library';

type LibraryState = {
  tracks: Track[];
  ready: boolean;
  error: string | null;
  addTracks: (added: Track[]) => Promise<void>;
};

const LibraryContext = createContext<LibraryState | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Track[]>([]);
  const pending = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    Promise.all([reconcileLibrary(), setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' })])
      .then(([library]) => {
        if (!active) return;
        current.current = library;
        setTracks(library);
        setReady(true);
      }).catch(() => {
        if (active) setError('Could not open your library. Please restart the app.');
      });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const operation = pending.current.then(async () => {
        const library = await reconcileLibrary();
        if (active) { current.current = library; setTracks(library); setError(null); }
      });
      pending.current = operation.catch(() => { if (active) setError('Could not refresh local music.'); });
    });
    return () => { active = false; subscription.remove(); };
  }, []);

  const addTracks = useCallback((added: Track[]) => {
    const operation = pending.current.then(async () => {
      const merged = new Map(current.current.map((track) => [track.id, track]));
      for (const track of added) merged.set(track.id, { ...track, addedAt: merged.get(track.id)?.addedAt ?? track.addedAt ?? Date.now() });
      const library = [...merged.values()].sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0));
      await saveLibrary(library);
      current.current = library;
      setTracks(library);
    });
    pending.current = operation.catch(() => {});
    return operation;
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    let scanning = false;
    let queued = false;
    const scan = async (requestAccess = false) => {
      if (scanning) { queued = true; return; }
      scanning = true;
      try {
        const discovered = await scanDeviceAudio(requestAccess);
        if (!active || !discovered) return;
        const operation = pending.current.then(async () => {
          const library = mergeDeviceLibrary(current.current, discovered);
          if (JSON.stringify(library) === JSON.stringify(current.current)) return;
          await saveLibrary(library);
          if (active) { current.current = library; setTracks(library); }
        });
        pending.current = operation.catch(() => {});
        await operation;
      } catch { if (active) setError('Could not scan device music. Check audio access in your device settings.'); }
      finally { scanning = false; if (active && queued) { queued = false; void scan(); } }
    };
    void scan(true);
    const stopWatching = watchDeviceAudio(() => { void scan(); });
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void scan(); });
    return () => { active = false; stopWatching(); subscription.remove(); };
  }, [ready]);

  return <LibraryContext.Provider value={{ tracks, ready, error, addTracks }}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('LibraryProvider is required');
  return value;
}
