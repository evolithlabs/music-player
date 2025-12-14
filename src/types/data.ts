export type TrackDownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed';

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  coverPath: string | undefined | null;
  year: number | undefined | null;
  duration: number; // duration in seconds
  path: string;
  spotify_id?: string | undefined | null;
  artist_id?: string | undefined | null;
  album_id?: string | undefined | null;
}

export interface Artist {
  id: string;
  name: string;
  tracksCount: number;
}

export interface Album {
  id: string;
  name: string;
  coverPath: string | undefined | null;
  tracksCount: number;
}
