import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getDatabase, writeLocal } from '../database';
import { DownloadJob, Track } from '../types/music';

const absoluteUri = (uri: string) => /^[a-z][a-z0-9+.-]*:/i.test(uri);
const resolveFile = (uri: string) => Platform.OS === 'web' || absoluteUri(uri) ? uri : new File(Paths.document, 'music', uri).uri;

export async function loadLibrary(): Promise<Track[]> {
  const tracks = await (await getDatabase()).getSongs();
  return tracks.map((track) => ({
    ...track,
    uri: resolveFile(track.uri),
    artworkUri: track.artworkUri ? resolveFile(track.artworkUri) : undefined,
  }));
}

export async function saveLibrary(tracks: Track[]) {
  // Store filenames so iOS sandbox path changes do not invalidate the library.
  const musicDirectory = new Directory(Paths.document, 'music').uri;
  const filename = (uri: string) => uri.startsWith(`${musicDirectory.replace(/\/$/, '')}/`) ? new File(uri).name : uri;
  const stored = tracks.map((track) => ({ ...track, uri: filename(track.uri), artworkUri: track.artworkUri ? filename(track.artworkUri) : undefined }));
  await writeLocal((db) => db.saveSongs(stored));
}

export async function reconcileLibrary(): Promise<Track[]> {
  const tracks = await loadLibrary();
  if (Platform.OS === 'web') return tracks;
  let changed = false;
  const reconciled = tracks.map((track) => {
    if (track.deviceAssetId) return track;
    const file = new File(track.uri);
    const fileState = file.exists && file.size > 0 ? 'available' as const : 'missing' as const;
    if (fileState === track.fileState) return track;
    changed = true;
    return { ...track, fileState };
  });
  // Preserve missing songs and their playlist/history links so restoring a file recovers them.
  const directory = new Directory(Paths.document, 'music');
  if (directory.exists) {
    const known = new Set(reconciled.map((track) => track.uri));
    for (const file of directory.list()) {
      if (!(file instanceof File) || known.has(file.uri) || !/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(file.name) || !file.size) continue;
      reconciled.push({ id: `recovered-${file.name}`, title: file.name.replace(/\.[^.]+$/, ''), artist: 'Unknown artist', origin: 'local', uri: file.uri, addedAt: Date.now(), fileState: 'available' });
      changed = true;
    }
  }
  if (changed) await saveLibrary(reconciled);
  return reconciled;
}

export async function receiveDownload(base: string, job: DownloadJob): Promise<Track> {
  if (!/^[a-z0-9]{15}$/.test(job.id) || job.status !== 'completed') throw new Error('Invalid completed download job');
  const directory = new Directory(Paths.document, 'music');
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, `service-${job.id}.mp3`);
  const partial = new File(directory, `service-${job.id}.part`);
  if (!file.exists || file.size === 0) {
    try {
      await File.downloadFileAsync(`${base}/api/downloads/${encodeURIComponent(job.id)}/file`, partial, { idempotent: true });
      if (partial.size === 0) throw new Error('The downloaded audio file is empty');
      if (file.exists) file.delete();
      partial.move(file);
    } catch (error) {
      if (partial.exists) partial.delete();
      throw error;
    }
  }
  let artworkUri: string | undefined;
  if (job.metadata.coverUrl) {
    const cover = new File(directory, `service-${job.id}.cover.jpg`);
    try {
      if (!cover.exists || cover.size === 0) await File.downloadFileAsync(job.metadata.coverUrl, cover, { idempotent: true });
      artworkUri = cover.uri;
    } catch {
      if (cover.exists) cover.delete();
      // Missing cover images must not prevent offline audio playback.
    }
  }
  return {
    id: `service-${job.id}`, uri: file.uri, title: job.metadata.title, artist: job.metadata.artist,
    album: job.metadata.album, artworkUri, durationMs: job.metadata.durationMs, origin: 'service', addedAt: Date.now(), fileState: 'available', deezerId: job.metadata.deezerId, isrc: job.metadata.isrc, metadataSource: job.metadata.source,
    catalog: job.metadata.recordingId ? { provider: 'musicbrainz', id: job.metadata.recordingId, releaseId: job.metadata.releaseId, isrc: job.metadata.isrc } : undefined,
  };
}
