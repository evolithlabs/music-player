
import { getDatabase, writeLocal } from '../database';
import type { DownloadJob, Track } from '../types/music';
import { createBrowserFiles } from './browser-files';

let files: ReturnType<typeof createBrowserFiles> | undefined;
async function browserFiles() {
  if (!files) {
    const db = await getDatabase();
    if (!db.getFile || !db.saveFile) throw new Error('Browser music storage is unavailable. Please reload the app.');
    files ??= createBrowserFiles({ getFile: db.getFile, saveFile: db.saveFile });
  }
  return files;
}

export async function loadLibrary(): Promise<Track[]> {
  const files = await browserFiles();
  const songs = await (await getDatabase()).getSongs();
  return Promise.all(songs.map(async (track) => {
    const audio = await files.resolve(track.uri);
    const artwork = track.artworkUri ? await files.resolve(track.artworkUri) : undefined;
    return { ...track, uri: audio.uri, artworkUri: artwork?.exists ? artwork.uri : undefined, fileState: audio.exists ? 'available' as const : 'missing' as const };
  }));
}

export async function saveLibrary(tracks: Track[]) {
  const files = await browserFiles();
  await writeLocal((db) => db.saveSongs(tracks.map((track) => ({
    ...track, uri: files.storedUri(track.uri), artworkUri: track.artworkUri ? files.storedUri(track.artworkUri) : undefined,
  }))));
}

export async function reconcileLibrary(): Promise<Track[]> {
  const tracks = await loadLibrary();
  await saveLibrary(tracks);
  return tracks;
}

export async function receiveDownload(base: string, job: DownloadJob): Promise<Track> {
  if (!/^[a-z0-9]{15}$/.test(job.id) || job.status !== 'completed') throw new Error('Invalid completed download job');
  const files = await browserFiles();
  const uri = await files.download(`service-${job.id}.mp3`, `${base}/api/downloads/${encodeURIComponent(job.id)}/file`, true);
  let artworkUri: string | undefined;
  if (job.metadata.coverUrl) {
    try { artworkUri = await files.download(`service-${job.id}.cover.jpg`, job.metadata.coverUrl); }
    catch { /* Missing artwork must not prevent saving or playing audio. */ }
  }
  return {
    id: `service-${job.id}`, uri, title: job.metadata.title, artist: job.metadata.artist,
    album: job.metadata.album, artworkUri, durationMs: job.metadata.durationMs, origin: 'service', addedAt: Date.now(), fileState: 'available', deezerId: job.metadata.deezerId, isrc: job.metadata.isrc, metadataSource: job.metadata.source,
    catalog: job.metadata.recordingId ? { provider: 'musicbrainz', id: job.metadata.recordingId, releaseId: job.metadata.releaseId, isrc: job.metadata.isrc } : undefined,
  };
}
