import { router, usePathname } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useDownloads } from '../state/DownloadsProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Track } from '../types/music';
import { sameCatalog } from '../utils/catalog';
import { downloadStatus } from '../utils/downloads';
import { Artwork } from './Artwork';
import { IconButton } from './Matte';
import { SongArtist } from './SongArtist';

export function SongRow({ track, onOptions, onSelect, onPlay, collection, playlistId, beforePlay, showDownload = false, compact = false, error }: { track: Track; onOptions: () => void; onSelect?: () => void; onPlay?: () => void; collection?: Track[]; playlistId?: string; beforePlay?: ReactNode; showDownload?: boolean; compact?: boolean; error?: string }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const playback = usePlayback();
  const pathname = usePathname();
  const downloads = useDownloads();
  const [downloadError, setDownloadError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const selected = playback.track?.id === track.id;
  const needsSelection = !selected || !!(playlistId && playback.currentPlaylistId !== playlistId);
  const missing = track.fileState === 'missing';
  const restore = missing ? downloads.entries.find((entry) => `service-${entry.job.id}` === track.id) : undefined;
  const entry = track.stream ? downloads.entries.find((entry) => entry.serviceUrl === track.stream?.serviceUrl && sameCatalog(entry.job.metadata, track.stream.metadata)) : undefined;
  const status = busy ? { compact: null, description: 'Queueing song' } : entry ? downloadStatus(entry) : null;
  async function download() {
    setBusy(true); setDownloadError(undefined);
    try {
      if (track.stream) await downloads.queue(track.stream.serviceUrl, track.stream.metadata);
      else if (restore) await downloads.retry(restore);
    } catch { setDownloadError('Could not download this song. Please try again.'); }
    finally { setBusy(false); }
  }
  function play() {
    onSelect?.();
    if (missing && restore) void playback.playCatalog(restore.serviceUrl, restore.job.metadata).catch(() => {});
    else if (onPlay) onPlay();
    else if (needsSelection || !playback.loaded) {
      if (collection) playback.playCollection(collection, track.id, undefined, playlistId);
      else playback.selectTrack(track);
    } else if (!playback.playing) { playback.recordSelection(track.id); playback.toggle(); }
    if (pathname !== '/now-playing') router.push('/now-playing');
  }
  return <View style={[styles.row, compact && styles.compact]}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} accessibilityState={{ selected, disabled: missing && !restore }} disabled={missing && !restore} onPress={play} style={styles.playArea} /><View pointerEvents="none" style={[styles.details, missing && styles.disabled]}><Artwork uri={track.artworkUri} square size={compact ? theme.size.track : undefined} playing={selected && playback.playing} /><View style={styles.metadata}><Text numberOfLines={1} style={[styles.title, selected && styles.activeTitle]}>{track.title}</Text><SongArtist artist={track.artist} trackId={track.deezerId} durationMs={track.durationMs} duration={selected ? playback.duration : 0} missing={missing} />{(error || downloadError) && <Text accessibilityRole="alert" style={styles.error}>{error || downloadError}</Text>}</View></View>
    {beforePlay ?? (showDownload && (status ? <View accessibilityLabel={`${track.title}: ${status.description}`} style={styles.status}>{status.compact === null ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <Text style={styles.statusText}>{status.compact}</Text>}</View> : <IconButton family="feather" icon={missing || track.stream ? 'download' : 'check'} label={missing || track.stream ? `Download ${track.title}` : `${track.title} is downloaded`} active disabled={(!restore && !track.stream) || !downloads.ready || busy} onPress={() => { void download(); }} />))}
    <IconButton icon="ellipsis-vertical" label={`Options for ${track.title}`} onPress={onOptions} />
  </View>;
}
const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs, minHeight: theme.size.track + theme.space.sm, paddingVertical: theme.space.sm, marginHorizontal: -theme.layout.contentInset, paddingHorizontal: theme.layout.contentInset },
  compact: { minHeight: theme.size.track, paddingVertical: 0, marginHorizontal: 0, paddingHorizontal: 0 },
  playArea: { position: 'absolute' as const, inset: 0 },
  details: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  metadata: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  error: { ...theme.type.caption, color: theme.colors.error, marginTop: theme.space.xs },
  activeTitle: { color: theme.colors.accent },
  disabled: { opacity: theme.opacity.disabled },
  status: { width: theme.size.trackControl, minHeight: theme.size.trackControl, justifyContent: 'center' as const, alignItems: 'center' as const },
  statusText: { ...theme.type.time, color: theme.colors.accent },
});
