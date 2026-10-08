import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

import { CatalogTrack, DownloadJob, Track } from '../types/music';
import { prepareStream } from '../services/stream';
import { getDownloadJob, queueTrack } from '../services/music-service';
import { matchesCatalog } from '../utils/catalog';
import { nextTrack, RepeatMode, upcomingTracks } from '../utils/playback';
import { SleepTimer, sleepTimerExpired } from '../utils/sleep';
import { useListeningHistory } from '../hooks/useListeningHistory';
import { useLibrary } from './LibraryProvider';
import { useAudioWaveform } from '../hooks/useAudioWaveform';
import { useTheme } from './ThemeProvider';
import { usePlaybackSession } from '../hooks/usePlaybackSession';
import { restorePlaybackSession } from '../utils/playback-session';
import { useQuickPicks } from '../hooks/useQuickPicks';
import { usePlaylistHistory } from '../hooks/usePlaylistHistory';
import { usePlaylists } from './PlaylistProvider';

type PlaybackState = {
  track?: Track; playing: boolean; loaded: boolean; buffering: boolean;
  currentTime: number; duration: number; progress: number; error: string | null;
  shuffle: boolean; repeat: RepeatMode; hasPrevious: boolean; hasNext: boolean;
  selectTrack: (track: Track) => void; toggle: () => void; seek: (seconds: number) => Promise<void>;
  previous: () => void; next: () => void; toggleShuffle: () => void; cycleRepeat: () => void;
  sleepTimer: SleepTimer; setSleepTimer: (minutes: number | 'end' | null) => void;
  recentlyPlayed: string[];
  recentlyPlayedPlaylists: string[]; playlistHistoryReady: boolean; currentPlaylistId?: string;
  quickPicks: string[]; recordSelection: (id: string) => void;
  playCollection: (tracks: Track[], startingId?: string, shuffled?: boolean, playlistId?: string) => void;
  upcoming: Track[]; playQueuedTrack: (track: Track) => void;
  playCatalog: (base: string, catalog: CatalogTrack) => Promise<void>;
  preparing?: { catalog: CatalogTrack; serviceUrl: string; job?: DownloadJob };
  playError?: { catalog?: CatalogTrack; serviceUrl?: string; trackId?: string; message: string };
};

const PlaybackContext = createContext<PlaybackState | null>(null);
const WaveformContext = createContext<SharedValue<number[]> | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const { tracks, ready: libraryReady } = useLibrary();
  const { playlists } = usePlaylists();
  const session = usePlaybackSession();
  const { ids: quickPicks, record: recordSelection, error: picksError } = useQuickPicks();
  const { saved: savedSession, ready: sessionReady, remember: rememberSession } = session;
  const restored = useRef(false);
  const userStarted = useRef(false);
  const pendingRestore = useRef<{ trackId: string; position: number } | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<Track>();
  const [preparing, setPreparing] = useState<PlaybackState['preparing']>();
  const streamRequest = useRef<AbortController | null>(null);
  const [request, setRequest] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<{ catalog: CatalogTrack; serviceUrl: string; message: string }>();
  const [sleepTimer, setSleep] = useState<SleepTimer>({ mode: 'off' });
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [playlistId, setPlaylistId] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);
  const track = remoteTrack?.id === selectedId ? remoteTrack : tracks.find((item) => item.id === selectedId);
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
  const duration = track && Number.isFinite(status.duration) ? Math.max(0, status.duration) : (preparing?.catalog.durationMs ?? catalogError?.catalog.durationMs ?? 0) / 1000;
  const currentTime = track && Number.isFinite(status.currentTime) ? Math.max(0, status.currentTime) : 0;
  const { recentlyPlayed, error: historyError } = useListeningHistory(track?.id, player.id, status.playing, currentTime, status.didJustFinish);
  const currentPlaylistId = track && queueIds?.includes(track.id) && playlists.some((item) => item.id === playlistId && item.trackIds.includes(track.id)) ? playlistId : undefined;
  const { ids: recentlyPlayedPlaylists, ready: playlistHistoryReady, error: playlistHistoryError } = usePlaylistHistory(currentPlaylistId, trackId, player.id, !restoring && status.isLoaded && status.playing);

  useEffect(() => {
    if (!libraryReady || !selectedId || track) return;
    player.pause();
    player.replace(null);
  }, [libraryReady, selectedId, track, player]);

  useEffect(() => {
    if (!libraryReady || !sessionReady || restored.current) return;
    restored.current = true;
    const saved = userStarted.current ? null : restorePlaybackSession(savedSession, tracks);
    if (!saved) { setRestoring(false); return; }
    pendingRestore.current = { trackId: saved.trackId, position: saved.position };
    setSelectedId(saved.trackId); setQueueIds(saved.queueIds); setPlaylistId(saved.playlistId); setHistory(saved.historyIds); setShuffle(saved.shuffle); setRepeat(saved.repeat);
  }, [libraryReady, sessionReady, savedSession, tracks]);

  useEffect(() => {
    if (!sessionReady || restoring || !track || track.stream || !status.isLoaded) return;
    rememberSession({ trackId: track.id, position: currentTime, queueIds, historyIds: history.slice(-50), shuffle, repeat, playlistId }, status.playing);
  }, [sessionReady, restoring, track, status.isLoaded, status.playing, currentTime, queueIds, history, shuffle, repeat, playlistId, rememberSession]);

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
    streamRequest.current?.abort(); streamRequest.current = null; setPreparing(undefined);
    setCatalogError(undefined);
    setRemoteTrack(selected.stream ? selected : undefined);
    if (selectedId && selectedId !== selected.id) setHistory((value) => [...value, selectedId]);
    setSelectedId(selected.id); setRequest((value) => value + 1); setError(null);
  }, [selectedId]);
  const upcoming = useMemo(() => upcomingTracks(queueTracks, selectedId, shuffle, repeat), [queueTracks, selectedId, shuffle, repeat]);
  const playQueuedTrack = useCallback((selected: Track) => {
    if (!queueTracks.some((track) => track.id === selected.id)) return;
    recordSelection(selected.id); startTrack(selected);
  }, [queueTracks, recordSelection, startTrack]);
  const selectTrack = useCallback((selected: Track) => { if (selected.fileState !== 'missing') recordSelection(selected.id); setQueueIds(null); setPlaylistId(undefined); startTrack(selected); }, [startTrack, recordSelection]);
  const playCatalog = useCallback(async (base: string, catalog: CatalogTrack) => {
    const local = tracks.find((item) => item.fileState !== 'missing' && matchesCatalog(item, catalog));
    if (local) { selectTrack(local); return; }
    streamRequest.current?.abort();
    const controller = new AbortController(); streamRequest.current = controller;
    userStarted.current = true; pendingRestore.current = null; setRestoring(false);
    setSelectedId(null); setRemoteTrack(undefined); setQueueIds([]); setPlaylistId(undefined);
    setPreparing({ catalog, serviceUrl: base }); setError(null); setCatalogError(undefined);
    try {
      player.pause();
      const remote = await prepareStream({ queueTrack, getDownloadJob }, base, catalog, controller.signal, (job) => setPreparing({ catalog, serviceUrl: base, job }));
      if (controller.signal.aborted) return;
      setQueueIds([]); setPlaylistId(undefined);
      startTrack(remote);
    } catch (error) {
      if (!controller.signal.aborted) {
        setCatalogError({ catalog, serviceUrl: base, message: error instanceof Error ? error.message : 'Could not prepare this song.' });
        throw error;
      }
    } finally {
      if (streamRequest.current === controller) { streamRequest.current = null; setPreparing(undefined); }
    }
  }, [tracks, selectTrack, startTrack, player]);
  useEffect(() => () => streamRequest.current?.abort(), []);
  const playCollection = useCallback((collection: Track[], startingId?: string, shuffled?: boolean, playlistId?: string) => {
    const available = collection.filter((item) => item.fileState !== 'missing');
    if (!available.length) return;
    userStarted.current = true; pendingRestore.current = null; setRestoring(false);
    streamRequest.current?.abort(); streamRequest.current = null; setPreparing(undefined); setRemoteTrack(undefined);
    setCatalogError(undefined);
    setQueueIds(available.map((item) => item.id)); setPlaylistId(playlistId); setHistory([]);
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
    error: error ?? session.error ?? historyError ?? playlistHistoryError ?? picksError ?? (track && status.playbackState === 'error' ? 'This audio file could not be loaded.' : null),
    playError: catalogError ?? (track && (error || status.playbackState === 'error') ? { trackId: track.id, message: error ?? 'This audio file could not be loaded.' } : undefined),
    shuffle, repeat, hasPrevious: !!track && (currentTime > 3 || history.length > 0 || queueTracks.findIndex((item) => item.id === selectedId) > 0),
    hasNext: !!track && (queueTracks.findIndex((item) => item.id === selectedId) < queueTracks.length - 1 || repeat === 'all' || (shuffle && queueTracks.length > 1)),
    selectTrack, playCollection, toggle, seek, previous, next, quickPicks, recordSelection, upcoming, playQueuedTrack, playCatalog, preparing,
    recentlyPlayed, recentlyPlayedPlaylists, playlistHistoryReady, currentPlaylistId, sleepTimer, setSleepTimer: (minutes) => setSleep(minutes === null ? { mode: 'off' } : minutes === 'end' ? { mode: 'end' } : { mode: 'time', minutes, deadline: Date.now() + minutes * 60000 }),
    toggleShuffle: () => setShuffle((value) => !value), cycleRepeat: () => setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'),
  }), [track, status, currentTime, duration, error, catalogError, session.error, historyError, playlistHistoryError, picksError, shuffle, repeat, history, queueTracks, selectedId, selectTrack, playCollection, toggle, seek, previous, next, sleepTimer, recentlyPlayed, recentlyPlayedPlaylists, playlistHistoryReady, currentPlaylistId, quickPicks, recordSelection, upcoming, playQueuedTrack, playCatalog, preparing]);

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
