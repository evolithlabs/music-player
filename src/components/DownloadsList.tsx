import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { CatalogTrack, Track } from '../types/music';
import { matchesCatalog, sameCatalog } from '../utils/catalog';
import { downloadStatus } from '../utils/downloads';
import { SongArtist } from './SongArtist';
import { Artwork } from './Artwork';
import { BottomSheet } from './BottomSheet';
import { IconButton } from './Matte';
import { SongActions } from './SongActions';

type DownloadSong = { track?: Track; catalog: CatalogTrack; serviceUrl: string };

export function DownloadsDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [song, setSong] = useState<DownloadSong>();
  const downloads = useDownloads();
  return <><BottomSheet visible={visible && !song} title="Downloads" onClose={onClose} scrollable={false}><DownloadsList drawer onNavigateArtist={onClose} onOptions={setSong} /></BottomSheet>{song && <SongActions track={song.track} catalog={song.catalog} onDownload={(play) => downloads.queue(song.serviceUrl, song.catalog, play)} onClose={() => setSong(undefined)} />}</>;
}

export function DownloadsList({ bottomPadding = 0, drawer = false, onOptions, onNavigateArtist }: { bottomPadding?: number; drawer?: boolean; onOptions?: (song: DownloadSong) => void; onNavigateArtist?: () => void }) {
  const styles = useThemeStyles(createStyles);
  const { theme } = useTheme();
  const downloads = useDownloads();
  const { entries, error, ready, retry } = downloads;
  const { tracks } = useLibrary();
  const playback = usePlayback();
  const [song, setSong] = useState<DownloadSong>();
  const [busy, setBusy] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<{ key: string; message: string } | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  return <>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <FlatList style={[styles.fullWidth, drawer ? styles.drawer : styles.page]} data={entries} keyExtractor={(entry) => `${entry.serviceUrl}:${entry.job.id}`} contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}
      ListEmptyComponent={<Text style={styles.empty}>Find a track in Search and tap Download to add it here.</Text>}
      renderItem={({ item }) => {
        const key = `${item.serviceUrl}:${item.job.id}`;
        const failed = item.job.status === 'failed' || item.transfer === 'failed';
        const track = tracks.find((song) => song.fileState !== 'missing' && (song.id === `service-${item.job.id}` || matchesCatalog(song, item.job.metadata)));
        const available = !!track;
        const selected = !!playback.track && matchesCatalog(playback.track, item.job.metadata);
        const label = item.transfer === 'saved' ? available ? null : 'Audio file missing' : item.transfer === 'failed' ? 'Could not save to device' : item.job.status === 'failed' ? 'Download failed' : null;
        const status = busy === key ? { compact: null, description: 'Retrying download' } : downloadStatus(item);
        const failureReason = retryError?.key === key ? retryError.message : failed ? item.transferError || item.job.error || 'Please try again.' : null;
        const canRetry = failed || (item.transfer === 'saved' && !available);
        async function retryDownload() {
          setBusy(key); setRetryError(null); setExpandedError(null);
          try { await retry(item); } catch { setRetryError({ key, message: 'Could not retry this download. Please try again.' }); }
          finally { setBusy(null); }
        }
        function play() {
          router.push('/now-playing');
          if (playback.preparing && sameCatalog(playback.preparing.catalog, item.job.metadata)) return;
          if (selected && playback.loaded) { if (!playback.playing) playback.toggle(); }
          else if (track) playback.selectTrack(track);
          else void playback.playCatalog(item.serviceUrl, item.job.metadata).catch(() => {});
        }
        return <View style={styles.card}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.job.metadata.title}`} accessibilityState={{ selected }} onPress={play} style={styles.playArea} />
          <View style={styles.row}><View pointerEvents="none" style={styles.details}><Artwork uri={track?.artworkUri ?? item.job.metadata.coverUrl} square playing={selected && playback.playing} /><View style={styles.trackText}><Text numberOfLines={1} style={[styles.title, selected && styles.activeTitle]}>{item.job.metadata.title || 'Queued recording'}</Text><SongArtist onNavigate={onNavigateArtist} artist={item.job.metadata.artist} trackId={item.job.metadata.deezerId} durationMs={track?.durationMs ?? item.job.metadata.durationMs} />{expandedError === key && (label || failureReason) && <Text accessibilityRole="alert" style={styles.inlineError}>{failureReason ? `${label ?? 'Download failed'} · ${failureReason}` : label}</Text>}</View></View>
            {(label || failureReason) && <IconButton icon="alert-circle-outline" label={`${expandedError === key ? 'Hide' : 'Show'} download error for ${item.job.metadata.title}`} active selected={expandedError === key} onPress={() => setExpandedError((current) => current === key ? null : key)} />}
            {(!available || canRetry) && (status ? <View accessibilityLabel={`${item.job.metadata.title}: ${status.description}`} style={styles.downloadStatus}>{status.compact === null ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <Text style={styles.downloadStatusText}>{status.compact}</Text>}</View> : canRetry && <IconButton icon="refresh-outline" label={`Retry download for ${item.job.metadata.title}`} active disabled={!ready || busy !== null} onPress={() => { void retryDownload(); }} />)}
            <IconButton icon="ellipsis-vertical" label={`Options for ${item.job.metadata.title}`} onPress={() => (onOptions ?? setSong)({ track, catalog: item.job.metadata, serviceUrl: item.serviceUrl })} />
          </View>
        </View>;
      }} />
    {song && <SongActions track={song.track} catalog={song.catalog} onDownload={(play) => downloads.queue(song.serviceUrl, song.catalog, play)} onClose={() => setSong(undefined)} />}
  </>;
}

const createStyles = (theme: Theme) => ({
  fullWidth: { marginHorizontal: -theme.layout.contentInset },
  page: { flex: 1 },
  drawer: { maxHeight: theme.size.panelHeight / 2, flexGrow: 0, flexShrink: 1 },
  list: { paddingTop: theme.space.md, paddingHorizontal: theme.layout.contentInset, gap: theme.space.md },
  card: { marginHorizontal: -theme.layout.contentInset, paddingHorizontal: theme.layout.contentInset, paddingVertical: theme.space.sm, gap: theme.space.sm },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs },
  playArea: { position: 'absolute' as const, inset: 0 },
  details: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  trackText: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  activeTitle: { color: theme.colors.accent },
  downloadStatus: { minWidth: theme.size.trackControl, minHeight: theme.size.trackControl, justifyContent: 'center' as const, alignItems: 'center' as const },
  downloadStatusText: { ...theme.type.time, color: theme.colors.accent },
  error: { ...theme.type.body, color: theme.colors.error },
  inlineError: { ...theme.type.caption, color: theme.colors.error },
  empty: { ...theme.type.body, color: theme.colors.muted, textAlign: 'center' as const, paddingVertical: theme.space.section },
});
