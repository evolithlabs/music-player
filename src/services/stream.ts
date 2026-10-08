import type { CatalogTrack, DownloadJob, Track } from '../types/music.ts';

type API = {
  queueTrack(base: string, track: CatalogTrack, signal?: AbortSignal): Promise<DownloadJob>;
  getDownloadJob(base: string, id: string, signal?: AbortSignal): Promise<DownloadJob>;
};

function wait(signal: AbortSignal, milliseconds: number) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Playback cancelled')); return; }
    const cancel = () => { clearTimeout(timer); reject(new Error('Playback cancelled')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, milliseconds);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

// Preparation never receives audio or writes to the offline library.
export async function prepareStream(api: API, base: string, catalog: CatalogTrack, signal: AbortSignal, onJob: (job: DownloadJob) => void, pollMs = 1000): Promise<Track> {
  const deadline = Date.now() + 10 * 60 * 1000;
  let job = await api.queueTrack(base, catalog, signal);
  for (;;) {
    if (signal.aborted) throw new Error('Playback cancelled');
    onJob(job);
    if (job.status === 'failed') throw new Error(job.error || 'Could not prepare this song. Please retry.');
    if (job.status === 'expired') throw new Error('This audio has expired. Press Play to prepare it again.');
    if (job.status === 'completed') return {
      id: `service-${job.id}`, title: job.metadata.title, artist: job.metadata.artist,
      album: job.metadata.album, durationMs: job.metadata.durationMs, artworkUri: job.metadata.coverUrl,
      uri: `${base}/api/downloads/${encodeURIComponent(job.id)}/file`, origin: 'service',
      deezerId: job.metadata.deezerId, isrc: job.metadata.isrc, metadataSource: job.metadata.source,
      catalog: job.metadata.recordingId ? { provider: 'musicbrainz', id: job.metadata.recordingId, releaseId: job.metadata.releaseId, isrc: job.metadata.isrc } : undefined,
      stream: { serviceUrl: base, metadata: job.metadata },
    };
    if (Date.now() >= deadline) throw new Error('Preparing this song took too long. Please retry.');
    await wait(signal, pollMs);
    job = await api.getDownloadJob(base, job.id, signal);
  }
}
