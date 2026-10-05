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
};

export type CatalogTrack = {
  deezerId?: number;
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

export type DownloadJob = {
  id: string;
  requestedReleaseId: string;
  status: 'queued' | 'resolving' | 'downloading' | 'completed' | 'failed';
  error?: string;
  metadata: CatalogTrack;
};
