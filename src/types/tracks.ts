export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverPath: string;
  year: number;
  duration: number; // duration in seconds
  path: string;
}

export type TrackDownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed';
