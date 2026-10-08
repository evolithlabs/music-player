import { router } from 'expo-router';
import { StyleProp, Text, TextStyle } from 'react-native';

export function ArtistLink({ artist, trackId, style, onNavigate }: { artist: string; trackId?: number; style?: StyleProp<TextStyle>; onNavigate?: () => void }) {
  return <Text accessibilityRole="link" accessibilityLabel={`View artist ${artist}`} numberOfLines={1} style={style} onPress={(event) => {
    event.stopPropagation();
    onNavigate?.();
    router.push({ pathname: '/artist', params: { name: artist, trackId: trackId?.toString() ?? '' } });
  }}>{artist}</Text>;
}
