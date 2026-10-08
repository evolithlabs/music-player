import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useDelayedValue } from '../hooks/useDelayedValue';
import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { CatalogTrack } from '../types/music';
import { catalogIdentity, matchesCatalog, sameCatalog } from '../utils/catalog';
import { downloadStatus } from '../utils/downloads';
import { Artwork } from './Artwork';
import { IconButton } from './Matte';
import { SongArtist } from './SongArtist';
import { SongRow } from './SongRow';

export function CatalogSongRow({ catalog, serviceUrl, onOptions, onSelect, showDownload = false, compact = false }: { catalog: CatalogTrack; serviceUrl: string; onOptions: () => void; onSelect?: () => void; showDownload?: boolean; compact?: boolean }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { tracks } = useLibrary();
  const playback = usePlayback();
  const downloads = useDownloads();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const track = tracks.find((song) => song.fileState !== 'missing' && matchesCatalog(song, catalog));
  const selected = !!playback.track && matchesCatalog(playback.track, catalog);
  const playing = selected && playback.playing;
  const preparing = !!playback.preparing && sameCatalog(playback.preparing.catalog, catalog);
  const waiting = useDelayedValue(preparing ? catalogIdentity(catalog) : undefined);
  const entry = downloads.entries.find((item) => item.serviceUrl === serviceUrl && sameCatalog(item.job.metadata, catalog));
  const status = busy ? { compact: null, description: 'Queueing song' } : entry ? downloadStatus(entry) : null;
  async function download() {
    setBusy(true); setError(undefined); onSelect?.();
    try { await downloads.queue(serviceUrl, catalog); } catch (error) { setError(error instanceof Error ? error.message : 'Could not queue this song.'); }
    finally { setBusy(false); }
  }
  function play() {
    router.push('/now-playing');
    if (preparing) return;
    onSelect?.(); setError(undefined);
    if (selected && playback.loaded) { if (!playback.playing) playback.toggle(); }
    else void playback.playCatalog(serviceUrl, catalog).catch(() => {});
  }
  if (track) return <SongRow track={track} compact={compact} showDownload={showDownload} onSelect={onSelect} onOptions={onOptions} />;
  return <View style={[styles.row, compact && styles.compact]}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${catalog.title}`} accessibilityState={{ selected, disabled: !serviceUrl }} disabled={!serviceUrl} onPress={play} style={styles.playArea} />
    <View pointerEvents="none" style={styles.details}><Artwork uri={catalog.coverUrl} square size={compact ? theme.size.track : undefined} playing={playing} preparing={!!waiting} /><View style={styles.metadata}>
      <Text numberOfLines={1} style={[styles.title, selected && styles.activeTitle]}>{catalog.title}</Text><SongArtist artist={catalog.artist} trackId={catalog.deezerId} durationMs={catalog.durationMs} />
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View></View>
    {showDownload && (status ? <View accessibilityLabel={`${catalog.title}: ${status.description}`} style={styles.status}>{status.compact === null ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <Text style={styles.statusText}>{status.compact}</Text>}</View> : <IconButton {...(entry && (entry.job.status === 'failed' || entry.transfer === 'failed') ? { icon: 'refresh-outline' as const } : { family: 'feather' as const, icon: 'download' as const })} label={`Download ${catalog.title}`} active disabled={!downloads.ready || busy || !serviceUrl} onPress={() => { void download(); }} />)}
    <IconButton icon="ellipsis-vertical" label={`Options for ${catalog.title}`} onPress={onOptions} />
  </View>;
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs, minHeight: theme.size.track + theme.space.sm, paddingVertical: theme.space.sm, marginHorizontal: -theme.layout.contentInset, paddingHorizontal: theme.layout.contentInset },
  compact: { minHeight: theme.size.track, paddingVertical: 0, marginHorizontal: 0, paddingHorizontal: 0 },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  playArea: { position: 'absolute' as const, inset: 0 },
  details: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  metadata: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  activeTitle: { color: theme.colors.accent },
  error: { ...theme.type.caption, color: theme.colors.error, marginTop: theme.space.xs },
  status: { width: theme.size.trackControl, minHeight: theme.size.trackControl, justifyContent: 'center' as const, alignItems: 'center' as const },
  statusText: { ...theme.type.time, color: theme.colors.accent },
});
