export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  coverPath: string;
  year: number;
  duration: number; // duration in seconds
  path: string;
  spotify_id?: string | undefined;
  artist_id?: string | undefined;
  album_id?: string | undefined;
}

export type TrackDownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed';
