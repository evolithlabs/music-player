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
  transferProgress?: number | null;
};

type DownloadsState = {
  entries: SavedJob[];
  ready: boolean;
  error: string | null;
  queue: (base: string, track: CatalogTrack, playWhenReady?: boolean) => Promise<void>;
  retry: (entry: SavedJob) => Promise<void>;
  forgetSong: (id: string) => Promise<void>;
};

const DownloadsContext = createContext<DownloadsState | null>(null);
const entryKey = (entry: SavedJob) => `${entry.serviceUrl}:${entry.job.id}`;

export function DownloadsProvider({ children }: PropsWithChildren) {
  const { ready: libraryReady, addTracks } = useLibrary();
  const { playCatalog } = usePlayback();
  const [entries, setEntries] = useState<SavedJob[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferProgress, setTransferProgress] = useState<Record<string, number | null>>({});
  const current = useRef<SavedJob[]>([]);
  const writing = useRef<Promise<void>>(Promise.resolve());
  const polling = useRef(false);
  const receiving = useRef(new Set<string>());

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
        await Promise.all(current.current.map(async (entry) => {
          if (controller.signal.aborted || entry.transfer !== 'pending' || entry.job.status === 'failed' || receiving.current.has(entryKey(entry))) return;
          try {
            const job = await getDownloadJob(entry.serviceUrl, entry.job.id, controller.signal);
            if (controller.signal.aborted) return;
            if (job.status === 'expired') {
              const renewed = await queueTrack(entry.serviceUrl, { ...job.metadata, releaseId: job.requestedReleaseId }, controller.signal);
              if (!controller.signal.aborted) await publish((entries) => entries.map((item) => entryKey(item) === entryKey(entry) ? { ...item, job: renewed } : item));
              return;
            }
            if (job.status !== entry.job.status || job.error !== entry.job.error || job.progress !== entry.job.progress || job.stage !== entry.job.stage) {
              await publish((entries) => entries.map((item) => entryKey(item) === entryKey(entry) ? { ...item, job } : item));
            }
            if (job.status === 'completed') {
              const key = entryKey(entry);
              receiving.current.add(key);
              void (async () => {
                try {
                  setTransferProgress((values) => ({ ...values, [key]: null }));
                  const track = await receiveDownload(entry.serviceUrl, job, (percent) => setTransferProgress((values) => values[key] === percent ? values : { ...values, [key]: percent }));
                  await addTracks([track]);
                  await publish((entries) => entries.map((item) => entryKey(item) === key ? { ...item, job, transfer: 'saved', transferError: undefined } : item));
                } catch (error) {
                  await publish((entries) => entries.map((item) => entryKey(item) === key ? { ...item, job, transfer: 'failed', transferError: error instanceof Error ? error.message : 'Could not save this track to your device. Check your connection and free storage, then retry.' } : item));
                } finally {
                  receiving.current.delete(key);
                  setTransferProgress((values) => { const next = { ...values }; delete next[key]; return next; });
                }
              })().catch(() => setError('Could not update your download queue. Please restart the app.'));
            }
          } catch {
            refreshFailed = true;
          }
        }));
        if (!controller.signal.aborted) setError(refreshFailed ? 'Could not refresh downloads. They will resume when the music service is reachable.' : null);
      } finally { polling.current = false; }
    }
    void poll();
    const timer = setInterval(() => { void poll(); }, 1000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [ready, libraryReady, publish, addTracks]);

  const queue = useCallback(async (base: string, track: CatalogTrack, playWhenReady = false) => {
    if (!ready) throw new Error('Your download queue is still loading.');
    if (playWhenReady) { await playCatalog(base, track); return; }
    const job = await queueTrack(base, track);

    await publish((entries) => {
      const existing = entries.find((entry) => entry.serviceUrl === base && entry.job.id === job.id);
      if (existing) return entries.map((entry) => entry === existing ? { ...entry, job, transfer: 'pending', transferError: undefined } : entry);
      return [{ job, serviceUrl: base, transfer: 'pending', queuedAt: Date.now() }, ...entries];
    });
    setError(null);
  }, [ready, publish, playCatalog]);

  const retry = useCallback(async (entry: SavedJob) => {
    // Recheck the server copy too: retention may have expired it since the failure.
    await queue(entry.serviceUrl, { ...entry.job.metadata, releaseId: entry.job.requestedReleaseId });
    setError(null);
  }, [queue]);

  const forgetSong = useCallback((id: string) => {
    const jobId = id.startsWith('service-') ? id.slice('service-'.length) : null;
    const operation = writing.current.then(async () => {
      if (!jobId) return;
      await writeLocal((db) => db.removeDownloads(jobId));
      current.current = current.current.filter((entry) => entry.job.id !== jobId);
      setEntries(current.current);
    });
    writing.current = operation.catch(() => {});
    return operation;
  }, []);

  return <DownloadsContext.Provider value={{ entries: entries.map((entry) => ({ ...entry, transferProgress: transferProgress[entryKey(entry)] })), ready, error, queue, retry, forgetSong }}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
  const state = useContext(DownloadsContext);
  if (!state) throw new Error('DownloadsProvider is required');
  return state;
}
