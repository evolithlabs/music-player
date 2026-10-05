import { addListener, AssetField, getPermissionsAsync, MediaType, Query, requestPermissionsAsync } from 'expo-media-library';
import { Platform } from 'react-native';

import { Track } from '../types/music';

export async function scanDeviceAudio(requestAccess = false): Promise<Track[] | null> {
  if (Platform.OS !== 'android') return null;
  let permission = await getPermissionsAsync(false, ['audio']);
  if (!permission.granted && permission.canAskAgain && requestAccess) permission = await requestPermissionsAsync(false, ['audio']);
  if (!permission.granted) return null;
  const tracks: Track[] = [];
  const batchSize = 200;
  for (let offset = 0; ; offset += batchSize) {
    const assets = await new Query().eq(AssetField.MEDIA_TYPE, MediaType.AUDIO).orderBy(AssetField.CREATION_TIME).offset(offset).limit(batchSize).exeForMetadata();
    for (const asset of assets) {
      const filename = (asset.filename ?? 'Unknown song').replace(/\.[^.]+$/, '');
      const [artist, ...title] = filename.split(' - ');
      tracks.push({ id: `device-${asset.id}`, deviceAssetId: asset.id, uri: asset.id, title: title.length ? title.join(' - ') : filename, artist: title.length ? artist : 'Unknown artist', durationMs: asset.duration ?? undefined, origin: 'local', addedAt: asset.creationTime ?? Date.now(), fileState: 'available' });
    }
    if (assets.length < batchSize) break;
  }
  return tracks;
}

export function watchDeviceAudio(onChange: () => void) {
  if (Platform.OS !== 'android') return () => {};
  const subscription = addListener(onChange);
  return () => subscription.remove();
}
