import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getDatabase, writeLocal } from '../database';

import { receiveDownload } from '../services/library';
import { getDownloadJob, queueTrack } from '../services/music-service';
import { CatalogTrack, DownloadJob } from '../types/music';
import { useLibrary } from './LibraryProvider';
import { usePlayback } from './PlaybackProvider';

export type SavedJob = {
  job: DownloadJob;
  serviceUrl: string;
  transfer: 'pending' | 'saved' | 'failed';
  transferError?: string;
  queuedAt?: number;
};

type DownloadsState = {
  entries: SavedJob[];
  ready: boolean;
  error: string | null;
  queue: (base: string, track: CatalogTrack, playWhenReady?: boolean) => Promise<void>;
  retry: (entry: SavedJob) => Promise<void>;
};

const DownloadsContext = createContext<DownloadsState | null>(null);
const entryKey = (entry: SavedJob) => `${entry.serviceUrl}:${entry.job.id}`;

export function DownloadsProvider({ children }: PropsWithChildren) {
  const { ready: libraryReady, addTracks } = useLibrary();
  const { selectTrack } = usePlayback();
  const [entries, setEntries] = useState<SavedJob[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<SavedJob[]>([]);
  const writing = useRef<Promise<void>>(Promise.resolve());
  const polling = useRef(false);
  const playRequests = useRef(new Set<string>());

  const publish = useCallback(async (update: (entries: SavedJob[]) => SavedJob[]) => {
    const operation = writing.current.then(async () => {
      const next = update(current.current);
      await writeLocal((db) => db.saveDownloads(next));
      current.current = next;
      setEntries(next);
    });
    writing.current = operation.catch(() => {});
    await operation;
  }, []);

  useEffect(() => {
    let active = true;
    getDatabase().then((db) => db.getDownloads<SavedJob>()).then((saved) => {
      if (!active) return;
      if (!Array.isArray(saved) || saved.some((entry) => !entry?.job?.id || !entry?.job?.metadata || typeof entry?.serviceUrl !== 'string')) throw new Error('Invalid saved download queue');
      current.current = (saved as SavedJob[]).sort((a, b) => (b.queuedAt ?? 0) - (a.queuedAt ?? 0));
      setEntries(current.current);
      setReady(true);
    }).catch(() => { if (active) setError('Could not restore your download queue. Restart the app before queueing new tracks.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !libraryReady) return;
    const controller = new AbortController();
    async function poll() {
      if (polling.current || controller.signal.aborted) return;
      polling.current = true;
      let refreshFailed = false;
      try {
        for (const entry of current.current) {
          if (controller.signal.aborted) break;
          if (entry.transfer !== 'pending' || entry.job.status === 'failed') continue;
          try {
            const job = await getDownloadJob(entry.serviceUrl, entry.job.id, controller.signal);
            if (controller.signal.aborted) break;
            if (job.status !== entry.job.status || job.error !== entry.job.error) {
              await publish((entries) => entries.map((item) => entryKey(item) === entryKey(entry) ? { ...item, job } : item));
            }
            if (job.status === 'completed') {
              try {
                const track = await receiveDownload(entry.serviceUrl, job);
                await addTracks([track]);
                if (playRequests.current.delete(entryKey(entry))) selectTrack(track);
                await publish((entries) => entries.map((item) => entryKey(item) === entryKey(entry) ? { ...item, job, transfer: 'saved', transferError: undefined } : item));
              } catch (error) {
                await publish((entries) => entries.map((item) => entryKey(item) === entryKey(entry) ? { ...item, job, transfer: 'failed', transferError: error instanceof Error ? error.message : 'Could not save this track to your device. Check your connection and free storage, then retry.' } : item));
              }
            }
          } catch {
            refreshFailed = true;
          }
        }
        if (!controller.signal.aborted) setError(refreshFailed ? 'Could not refresh downloads. They will resume when the music service is reachable.' : null);
      } finally { polling.current = false; }
    }
    void poll();
    const timer = setInterval(() => { void poll(); }, 5000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [ready, libraryReady, publish, addTracks, selectTrack]);

  const queue = useCallback(async (base: string, track: CatalogTrack, playWhenReady = false) => {
    if (!ready) throw new Error('Your download queue is still loading.');
    const job = await queueTrack(base, track);
    if (playWhenReady) playRequests.current.add(`${base}:${job.id}`);
    await publish((entries) => {
      const existing = entries.find((entry) => entry.serviceUrl === base && entry.job.id === job.id);
      if (existing) return entries.map((entry) => entry === existing ? { ...entry, job, transfer: 'pending', transferError: undefined } : entry);
      return [{ job, serviceUrl: base, transfer: 'pending', queuedAt: Date.now() }, ...entries];
    });
    setError(null);
  }, [ready, publish]);

  const retry = useCallback(async (entry: SavedJob) => {
    if (entry.job.status === 'failed') await queue(entry.serviceUrl, { ...entry.job.metadata, releaseId: entry.job.requestedReleaseId });
    else await publish((entries) => entries.map((item) => entryKey(item) === entryKey(entry) ? { ...item, transfer: 'pending', transferError: undefined } : item));
    setError(null);
  }, [queue, publish]);

  return <DownloadsContext.Provider value={{ entries, ready, error, queue, retry }}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
  const state = useContext(DownloadsContext);
  if (!state) throw new Error('DownloadsProvider is required');
  return state;
}
