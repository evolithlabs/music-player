export interface SpotifyAccessTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface SpotifyResponse<T> {
  items?: T[];
  total?: number;
  limit?: number;
  offset?: number;
  next?: string;
  previous?: string;
}

export interface SpotifyTrackResponse {
  tracks?: SpotifyResponse<SpotifyTrack>;
}

export interface SpotifyTrack {
  album?: SpotifyAlbum;
  artists?: SpotifyArtist[];
  available_markets?: string[];
  disc_number?: number;
  duration_ms?: number;
  explicit?: boolean;
  external_ids?: SpotifyExternalIds;
  external_urls?: SpotifyExternalUrls;
  href?: string;
  id?: string;
  is_playable?: boolean;
  name?: string;
  popularity?: number;
  preview_url?: string | null;
  track_number?: number;
  type?: SpotifyType;
  uri?: string;
  is_local?: boolean;
}

export interface SpotifyAlbum {
  album_type?: string;
  total_tracks?: number;
  available_markets?: string[];
  external_urls?: SpotifyExternalUrls;
  href?: string;
  id?: string;
  images?: SpotifyImage[];
  name?: string;
  release_date?: string;
  release_date_precision?: string;
  type?: SpotifyType;
  uri?: string;
  artists?: SpotifyArtist[];
  is_playable?: boolean;
}

export interface SpotifyArtist {
  external_urls?: SpotifyExternalUrls;
  href?: string;
  id?: string;
  images?: SpotifyImage[];
  name?: string;
  genres?: string[];
  type?: SpotifyType;
  uri?: string;
}

export interface SpotifyPlaylist {
  collaborative?: boolean;
  description?: string;
  external_urls?: SpotifyExternalUrls;
  href?: string;
  id?: string;
  images?: SpotifyImage[];
  name?: string;
  owner?: {
    external_urls?: SpotifyExternalUrls;
    href?: string;
    id?: string;
    type?: string; // usually "user"
    uri?: string;
    display_name?: string;
  };
  public?: boolean;
  snapshot_id?: string;
  tracks?: {
    href?: string;
    total?: number;
  };
  type?: string; // usually "playlist"
  uri?: string;
  primary_color?: string | null;
}

export interface SpotifyImage {
  url?: string;
  height?: number;
  width?: number;
}

export interface SpotifyExternalUrls {
  spotify?: string;
}

export interface SpotifyExternalIds {
  isrc?: string;
}

export type SpotifyType = 'track' | 'artist' | 'album' | 'playlist';
