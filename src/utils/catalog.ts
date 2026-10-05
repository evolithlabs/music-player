import type { CatalogTrack, Track } from '../types/music';

export function catalogIdentity(track: CatalogTrack) {
  return track.deezerId ? `deezer:${track.deezerId}` : `musicbrainz:${track.recordingId}:${track.releaseId ?? ''}`;
}

export function matchesCatalog(track: Track, catalog: CatalogTrack) {
  if (track.deezerId && catalog.deezerId) return track.deezerId === catalog.deezerId;
  return !!catalog.recordingId && track.catalog?.id === catalog.recordingId && (track.catalog.releaseId ?? '') === (catalog.releaseId ?? '');
}

export function sameCatalog(a: CatalogTrack, b: CatalogTrack) {
  return catalogIdentity(a) === catalogIdentity(b);
}
