export interface DatabaseTrack {
  id: string;
  spotify_id: string | undefined;
  title: string;
  artist: string | undefined;
  album: string | undefined;
  coverPath: string | undefined;
  year: number | undefined;
  duration: number; // duration in seconds
  path: string;
}

interface Database {
  tracks: DatabaseTrack;
}

export type { Database };
