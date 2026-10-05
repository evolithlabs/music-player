import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePlayback } from '../state/PlaybackProvider';
import { useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Track } from '../types/music';
import { Artwork } from './Artwork';
import { IconButton, Recessed, RoundButton } from './Matte';

export function SongRow({ track, onOptions, onSelect, collection }: { track: Track; onOptions: () => void; onSelect?: () => void; collection?: Track[] }) {
  const styles = useThemeStyles(createStyles);
  const playback = usePlayback();
  const selected = playback.track?.id === track.id;
  const missing = track.fileState === 'missing';
  const select = () => { if (collection) playback.playCollection(collection, track.id); else playback.selectTrack(track); };
  const content = <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={`Open player for ${track.title}`} accessibilityState={{ selected, disabled: missing }} disabled={missing} onPress={() => { onSelect?.(); if (!selected) select(); else playback.recordSelection(track.id); router.push('/now-playing'); }} style={[styles.details, missing && styles.disabled]}><Artwork uri={track.artworkUri} square /><View style={styles.metadata}><Text numberOfLines={1} style={[styles.title, selected && styles.activeTitle]}>{track.title}</Text><Text numberOfLines={1} style={styles.artist}>{missing ? 'File missing' : track.artist}</Text></View></Pressable><RoundButton icon={selected && playback.playing ? 'pause' : 'play'} label={`${selected && playback.playing ? 'Pause' : 'Play'} ${track.title}`} size="track" active={selected} disabled={missing} onPress={() => { onSelect?.(); if (selected) { if (!playback.playing) playback.recordSelection(track.id); playback.toggle(); } else select(); }} /><IconButton icon="ellipsis-vertical" label={`Options for ${track.title}`} onPress={onOptions} /></View>;
  return selected ? <Recessed style={styles.selected}>{content}</Recessed> : content;
}
const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs, minHeight: theme.size.track + theme.space.sm, paddingVertical: theme.space.sm },
  details: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  metadata: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  artist: { ...theme.type.caption, color: theme.colors.muted },
  selected: { marginVertical: theme.space.xs },
  activeTitle: { color: theme.colors.accent },
  disabled: { opacity: theme.opacity.disabled },
});
