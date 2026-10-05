import type { Track } from '../types/music';

export function mergeDeviceLibrary(existing: Track[], discovered: Track[] | null): Track[] {
  // No permission or unsupported platform does not mean the user's files disappeared.
  if (discovered === null) return existing;
  const found = new Set(discovered.map((track) => track.deviceAssetId));
  const merged = new Map(existing.map((track) => [track.id, track.deviceAssetId && !found.has(track.deviceAssetId) ? { ...track, fileState: 'missing' as const } : track]));
  for (const track of discovered) {
    const previous = merged.get(track.id);
    merged.set(track.id, previous ? { ...track, ...previous, uri: track.uri, fileState: 'available' } : track);
  }
  return [...merged.values()].sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0));
}
