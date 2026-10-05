import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

import { Track } from '../types/music';
import { nextTrack, RepeatMode } from '../utils/playback';
import { SleepTimer, sleepTimerExpired } from '../utils/sleep';
import { useListeningHistory } from '../hooks/useListeningHistory';
import { useLibrary } from './LibraryProvider';
import { useAudioWaveform } from '../hooks/useAudioWaveform';
import { useTheme } from './ThemeProvider';
import { usePlaybackSession } from '../hooks/usePlaybackSession';
import { restorePlaybackSession } from '../utils/playback-session';
import { useQuickPicks } from '../hooks/useQuickPicks';

type PlaybackState = {
  track?: Track; playing: boolean; loaded: boolean; buffering: boolean;
  currentTime: number; duration: number; progress: number; error: string | null;
  shuffle: boolean; repeat: RepeatMode; hasPrevious: boolean; hasNext: boolean;
  selectTrack: (track: Track) => void; toggle: () => void; seek: (seconds: number) => Promise<void>;
  previous: () => void; next: () => void; toggleShuffle: () => void; cycleRepeat: () => void;
  sleepTimer: SleepTimer; setSleepTimer: (minutes: number | 'end' | null) => void;
  recentlyPlayed: string[];
  quickPicks: string[]; recordSelection: (id: string) => void;
  playCollection: (tracks: Track[], startingId?: string, shuffled?: boolean) => void;
};

const PlaybackContext = createContext<PlaybackState | null>(null);
const WaveformContext = createContext<SharedValue<number[]> | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const { tracks, ready: libraryReady } = useLibrary();
  const session = usePlaybackSession();
  const { ids: quickPicks, record: recordSelection, error: picksError } = useQuickPicks();
  const { saved: savedSession, ready: sessionReady, remember: rememberSession } = session;
  const restored = useRef(false);
  const userStarted = useRef(false);
  const pendingRestore = useRef<{ trackId: string; position: number } | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [request, setRequest] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [error, setError] = useState<string | null>(null);
  const [sleepTimer, setSleep] = useState<SleepTimer>({ mode: 'off' });
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const track = tracks.find((item) => item.id === selectedId);
  const trackId = track?.id;
  const queueTracks = useMemo(() => (queueIds ? queueIds.map((id) => tracks.find((item) => item.id === id)).filter((item): item is Track => !!item) : tracks).filter((item) => item.fileState !== 'missing'), [queueIds, tracks]);
  const player = useAudioPlayer(track ? { uri: track.uri } : null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const { theme } = useTheme();
  const waveform = useSharedValue<number[]>([]);
  useAudioWaveform(player, !!track && status.playing, theme.dock.waveformBars, waveform);
  const lastRequest = useRef('');
  const handledFinish = useRef(false);
  const previousFile = useRef<{ id: string; missing: boolean } | undefined>(undefined);
  const duration = Number.isFinite(status.duration) ? Math.max(0, status.duration) : 0;
  const currentTime = Number.isFinite(status.currentTime) ? Math.max(0, status.currentTime) : 0;
  const { recentlyPlayed, error: historyError } = useListeningHistory(track?.id, player.id, status.playing, currentTime, status.didJustFinish);

  useEffect(() => {
    if (!libraryReady || !sessionReady || restored.current) return;
    restored.current = true;
    const saved = userStarted.current ? null : restorePlaybackSession(savedSession, tracks);
    if (!saved) { setRestoring(false); return; }
    pendingRestore.current = { trackId: saved.trackId, position: saved.position };
    setSelectedId(saved.trackId); setQueueIds(saved.queueIds); setHistory(saved.historyIds); setShuffle(saved.shuffle); setRepeat(saved.repeat);
  }, [libraryReady, sessionReady, savedSession, tracks]);

  useEffect(() => {
    if (!sessionReady || restoring || !track || !status.isLoaded) return;
    rememberSession({ trackId: track.id, position: currentTime, queueIds, historyIds: history.slice(-50), shuffle, repeat }, status.playing);
  }, [sessionReady, restoring, track, status.isLoaded, status.playing, currentTime, queueIds, history, shuffle, repeat, rememberSession]);

  useEffect(() => {
    const previous = previousFile.current;
    previousFile.current = track ? { id: track.id, missing: track.fileState === 'missing' } : undefined;
    if (!track || previous?.id !== track.id || !previous.missing || track.fileState === 'missing') return;
    // A restored file can have the same URI as a previously failed audio source.
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) { player.replace({ uri: track.uri }); setError(null); } }).catch(() => { if (!cancelled) setError('Could not reload this restored song.'); });
    return () => { cancelled = true; };
  }, [track, player]);

  useEffect(() => {
    if (sleepTimer.mode !== 'time') return;
    const check = () => {
      if (!sleepTimerExpired(sleepTimer, Date.now())) return;
      try { player.pause(); } catch { setError('Could not stop playback for the sleep timer.'); }
      setSleep({ mode: 'off' });
    };
    const timer = setTimeout(check, Math.max(0, sleepTimer.deadline - Date.now()));
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [sleepTimer, player]);

  const startTrack = useCallback((selected: Track) => {
    if (selected.fileState === 'missing') { setError('This song’s audio is unavailable. Check device audio access or download it again.'); return; }
    userStarted.current = true; pendingRestore.current = null; setRestoring(false);
    if (selectedId && selectedId !== selected.id) setHistory((value) => [...value, selectedId]);
    setSelectedId(selected.id); setRequest((value) => value + 1); setError(null);
  }, [selectedId]);
  const selectTrack = useCallback((selected: Track) => { if (selected.fileState !== 'missing') recordSelection(selected.id); setQueueIds(null); startTrack(selected); }, [startTrack, recordSelection]);
  const playCollection = useCallback((collection: Track[], startingId?: string, shuffled?: boolean) => {
    const available = collection.filter((item) => item.fileState !== 'missing');
    if (!available.length) return;
    userStarted.current = true; pendingRestore.current = null; setRestoring(false);
    setQueueIds(available.map((item) => item.id)); setHistory([]);
    if (shuffled !== undefined) setShuffle(shuffled);
    const first = available.find((item) => item.id === startingId) ?? available[shuffled ? Math.floor(Math.random() * available.length) : 0];
    if (startingId) recordSelection(first.id);
    setSelectedId(first.id); setRequest((value) => value + 1); setError(null);
  }, [recordSelection]);

  useEffect(() => {
    const key = `${player.id}:${request}`;
    if (trackId && status.isLoaded && lastRequest.current !== key) {
      let canceled = false;
      void Promise.resolve().then(async () => {
        if (canceled) return;
        lastRequest.current = key;
        const restore = pendingRestore.current;
        if (restore?.trackId === trackId) {
          await player.seekTo(Math.min(restore.position, player.duration > 0 ? player.duration : restore.position));
          if (canceled) return;
          pendingRestore.current = null; setRestoring(false);
          return;
        }
        if (player.duration > 0 && player.currentTime >= player.duration) await player.seekTo(0);
        if (canceled) return;
        player.play();
      }).catch(() => { if (!canceled) { pendingRestore.current = null; setRestoring(false); setError('Could not play or restore this audio file.'); } });
      return () => { canceled = true; };
    }
  }, [player, request, status.isLoaded, trackId]);

  const seek = useCallback(async (seconds: number) => {
    if (!track || !status.isLoaded || !Number.isFinite(seconds)) return;
    try { await player.seekTo(Math.max(0, Math.min(seconds, duration))); }
    catch { setError('Could not seek in this audio file.'); }
  }, [track, player, status.isLoaded, duration]);

  const toggle = useCallback(() => {
    if (!track || !status.isLoaded) return;
    setError(null);
    if (status.playing) { try { player.pause(); } catch { setError('Could not pause this audio file.'); } return; }
    if (duration > 0 && currentTime >= duration) {
      void player.seekTo(0).then(() => player.play()).catch(() => setError('Could not restart this audio file.'));
    } else {
      try { player.play(); } catch { setError('Could not play this audio file.'); }
    }
  }, [track, player, status.isLoaded, status.playing, duration, currentTime]);

  const next = useCallback(() => {
    const following = nextTrack(queueTracks, selectedId, shuffle, repeat);
    if (following?.id === selectedId) {
      void player.seekTo(0).then(() => player.play()).catch(() => setError('Could not restart this audio file.'));
    } else if (following) startTrack(following);
  }, [queueTracks, selectedId, shuffle, repeat, startTrack, player]);

  const previous = useCallback(() => {
    if (currentTime > 3) { void seek(0); return; }
    const priorId = history[history.length - 1];
    setHistory((value) => value.slice(0, -1));
    const prior = tracks.find((item) => item.id === priorId && item.fileState !== 'missing') ?? queueTracks[queueTracks.findIndex((item) => item.id === selectedId) - 1];
    if (prior) { userStarted.current = true; pendingRestore.current = null; setRestoring(false); setSelectedId(prior.id); setRequest((value) => value + 1); setError(null); }
  }, [currentTime, seek, tracks, queueTracks, selectedId, history]);

  useEffect(() => {
    if (!status.didJustFinish) { handledFinish.current = false; return; }
    if (handledFinish.current) return;
    handledFinish.current = true;
    if (sleepTimer.mode === 'end') {
      void Promise.resolve().then(() => { player.pause(); setSleep({ mode: 'off' }); }).catch(() => setError('Could not stop playback for the sleep timer.'));
      return;
    }
    if (repeat === 'one') {
      void player.seekTo(0).then(() => player.play()).catch(() => setError('Could not repeat this audio file.'));
    } else {
      let canceled = false;
      void Promise.resolve().then(() => { if (!canceled) next(); });
      return () => { canceled = true; };
    }
  }, [status.didJustFinish, repeat, player, next, sleepTimer]);

  const value = useMemo<PlaybackState>(() => ({
    track, playing: !!track && status.playing, loaded: !!track && status.isLoaded, buffering: status.isBuffering,
    currentTime, duration, progress: duration > 0 ? Math.min(1, currentTime / duration) : 0,
    error: error ?? session.error ?? historyError ?? picksError ?? (track && status.playbackState === 'error' ? 'This audio file could not be loaded.' : null),
    shuffle, repeat, hasPrevious: !!track && (currentTime > 3 || history.length > 0 || queueTracks.findIndex((item) => item.id === selectedId) > 0),
    hasNext: !!track && (queueTracks.findIndex((item) => item.id === selectedId) < queueTracks.length - 1 || repeat === 'all' || (shuffle && queueTracks.length > 1)),
    selectTrack, playCollection, toggle, seek, previous, next, quickPicks, recordSelection,
    recentlyPlayed, sleepTimer, setSleepTimer: (minutes) => setSleep(minutes === null ? { mode: 'off' } : minutes === 'end' ? { mode: 'end' } : { mode: 'time', minutes, deadline: Date.now() + minutes * 60000 }),
    toggleShuffle: () => setShuffle((value) => !value), cycleRepeat: () => setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'),
  }), [track, status, currentTime, duration, error, session.error, historyError, picksError, shuffle, repeat, history, queueTracks, selectedId, selectTrack, playCollection, toggle, seek, previous, next, sleepTimer, recentlyPlayed, quickPicks, recordSelection]);

  return <WaveformContext.Provider value={waveform}><PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider></WaveformContext.Provider>;
}

export function useWaveform() {
  const waveform = useContext(WaveformContext);
  if (!waveform) throw new Error('PlaybackProvider is required');
  return waveform;
}

export function usePlayback() {
  const value = useContext(PlaybackContext);
  if (!value) throw new Error('PlaybackProvider is required');
  return value;
}
