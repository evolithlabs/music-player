export interface DatabaseTrack {
  id?: number | undefined;
  spotify_id: string | undefined;
  name: string;
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
