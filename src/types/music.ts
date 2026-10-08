export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUri?: string;
  durationMs?: number;
  addedAt?: number;
  fileState?: 'available' | 'missing';
  deezerId?: number;
  isrc?: string;
  metadataSource?: 'deezer' | 'musicbrainz';
  syncedLyrics?: string;
  waveform?: number[];
  catalog?: {
    provider: 'musicbrainz';
    id: string;
    releaseId?: string;
    isrc?: string;
  };
  origin: 'local' | 'service';
  uri: string;
  deviceAssetId?: string;
  stream?: { serviceUrl: string; metadata: CatalogTrack };
};

export type CatalogTrack = {
  deezerId?: number;
  deezerArtistId?: number;
  deezerAlbumId?: number;
  previewUrl?: string;
  catalogUrl?: string;
  source?: 'deezer' | 'musicbrainz';
  recordingId: string;
  releaseId?: string;
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  coverUrl?: string;
  isrc?: string;
  disambiguation?: string;
};

export type CatalogArtist = { id: number; name: string; pictureUrl?: string };
export type CatalogAlbum = { id: number; title: string; artist: string; artistId: number; coverUrl?: string; trackCount: number; releaseDate?: string };
export type CatalogPage<T> = { count: number; nextOffset: number | null } & T;

export type DownloadJob = {
  id: string;
  requestedReleaseId: string;
  status: 'queued' | 'resolving' | 'downloading' | 'completed' | 'failed' | 'expired';
  error?: string;
  progress?: number;
  stage?: 'starting' | 'downloading' | 'processing';
  metadata: CatalogTrack;
};
