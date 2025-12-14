export interface DatabaseTrack {
  id: number | undefined;
  name: string | null;
  cover_path: string | null;
  year: number | null;
  duration: number | null; // duration in seconds
  path: string | null;
  spotify_id: string | null;
  local_id: string | null;
  album_id: number | null;
}

export interface DatabaseAlbum {
  id: number | undefined;
  name: string | null;
  cover_path: string | null;
  spotify_id: string | null;
}

export interface DatabaseArtist {
  id: number | null;
  name: string | null;
  spotify_id: string | null;
}

export interface DatabaseTracksArtist {
  id: number | null;
  track_id: number | null;
  artist_id: number | null;
  [key: string]: any;
}

export interface DatabaseSettings {
  id: number | undefined;
  app_is_initialized: boolean | null;
}

interface Database {
  tracks: DatabaseTrack;
  albums: DatabaseAlbum;
  artists: DatabaseArtist;
  tracks_artists: DatabaseTracksArtist;
  settings: DatabaseSettings;
}

export type { Database };
