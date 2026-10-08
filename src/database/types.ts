import { Track } from '../types/music';
import { Playlist } from '../types/collection';

export type ListeningEvent = { id: string; songId: string; startedAt: number; heardSeconds: number; position: number; completed: boolean };
export type StoredDownload = { serviceUrl: string; transfer: string; job: { id: string; status: string } };
export type ListeningStats = { plays: number; heardSeconds: number; completed: number };
export interface LocalDatabase {
  // Browser-only binary storage; native audio uses the app document directory.
  getFile?(key: string): Promise<Blob | undefined>;
  saveFile?(key: string, data: Blob): Promise<void>;
  removeFile?(key: string): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getSongs(): Promise<Track[]>;
  saveSongs(songs: Track[]): Promise<void>;
  removeSong(id: string): Promise<void>;
  getPlaylists(): Promise<Playlist[]>;
  savePlaylists(playlists: Playlist[]): Promise<void>;
  removePlaylist(id: string): Promise<void>;
  getDownloads<T>(): Promise<T[]>;
  saveDownloads(entries: StoredDownload[]): Promise<void>;
  removeDownloads(jobId: string): Promise<void>;
  saveListeningEvent(event: ListeningEvent): Promise<void>;
  getRecentSongIds(): Promise<string[]>;
  getListeningStats(): Promise<ListeningStats>;
}
