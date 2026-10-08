import { Text, View } from 'react-native';

import { useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { formatTime } from '../utils/playback';
import { ArtistLink } from './ArtistLink';

export function SongArtist({ artist, trackId, durationMs, duration = 0, missing = false, onNavigate, linkArtist = false }: { artist: string; trackId?: number; durationMs?: number; duration?: number; missing?: boolean; onNavigate?: () => void; linkArtist?: boolean }) {
  const styles = useThemeStyles(createStyles);
  const seconds = duration > 0 ? duration : (durationMs ?? 0) / 1000;
  return <View style={styles.row}>{linkArtist ? <ArtistLink artist={artist} trackId={trackId} style={styles.artist} onNavigate={onNavigate} /> : <Text numberOfLines={1} style={styles.artist}>{artist}</Text>}{seconds > 0 && <Text style={styles.caption}> • {formatTime(seconds)}</Text>}{missing && <Text style={styles.caption}> • File missing</Text>}</View>;
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  artist: { ...theme.type.caption, color: theme.colors.muted, flexShrink: 1, minWidth: 0 },
  caption: { ...theme.type.caption, color: theme.colors.muted, flexShrink: 0 },
});
