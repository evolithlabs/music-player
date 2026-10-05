import { useMemo } from 'react';
import { View } from 'react-native';

import { useLibrary } from '../state/LibraryProvider';
import { useTheme } from '../state/ThemeProvider';
import { Playlist } from '../types/collection';
import { Artwork } from './Artwork';

export function PlaylistArtwork({ playlist, size }: { playlist: Playlist; size: number }) {
  const { tracks } = useLibrary();
  const { theme } = useTheme();
  const covers = useMemo(() => playlist.trackIds.slice(0, 4).map((id) => tracks.find((track) => track.id === id)?.artworkUri), [playlist.trackIds, tracks]);
  if (covers.length <= 1) return <Artwork uri={covers[0]} square size={size} />;
  return <View accessibilityLabel={`Covers for ${playlist.name}`} style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', borderRadius: theme.radius.card / 2, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
    {Array.from({ length: 4 }, (_, index) => <View key={index} style={{ width: size / 2, height: size / 2, overflow: 'hidden' }}><Artwork uri={covers[index % covers.length]} square size={size / 2} /></View>)}
  </View>;
}
