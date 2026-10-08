import { useLocalSearchParams } from 'expo-router';

import { CatalogCollection } from '../../components/CatalogCollection';

export default function ArtistScreen() {
  const { name = '', trackId } = useLocalSearchParams<{ name?: string; trackId?: string }>();
  return <CatalogCollection key={JSON.stringify([name, trackId])} kind="artist" name={name} trackId={trackId} />;
}
