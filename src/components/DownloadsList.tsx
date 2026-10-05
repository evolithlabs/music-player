import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Track } from '../types/music';
import { matchesCatalog } from '../utils/catalog';
import { Artwork } from './Artwork';
import { BottomSheet } from './BottomSheet';
import { IconButton, RoundButton } from './Matte';
import { SongActions } from './SongActions';

const statusLabels = { queued: 'Queued', resolving: 'Finding metadata', downloading: 'Preparing audio', completed: 'Saving to your library', failed: 'Service download failed' };

export function DownloadsDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [playlistTrack, setPlaylistTrack] = useState<Track>();
  return <><BottomSheet visible={visible && !playlistTrack} title="Downloads" onClose={onClose} scrollable={false}><DownloadsList drawer onAddToPlaylist={setPlaylistTrack} /></BottomSheet>{playlistTrack && <SongActions key={playlistTrack.id} track={playlistTrack} initialMode="playlists" onClose={() => setPlaylistTrack(undefined)} />}</>;
}

export function DownloadsList({ bottomPadding = 0, drawer = false, onAddToPlaylist }: { bottomPadding?: number; drawer?: boolean; onAddToPlaylist?: (track: Track) => void }) {
  const styles = useThemeStyles(createStyles);
  const { theme } = useTheme();
  const { entries, error, retry } = useDownloads();
  const { tracks } = useLibrary();
  const playback = usePlayback();
  const playlists = usePlaylists();
  const [playlistTrack, setPlaylistTrack] = useState<Track>();
  const [busy, setBusy] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  return <>
    {(error || retryError) && <Text accessibilityRole="alert" style={styles.error}>{retryError || error}</Text>}
    <FlatList style={drawer ? styles.drawer : styles.page} data={entries} keyExtractor={(entry) => `${entry.serviceUrl}:${entry.job.id}`} contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}
      ListEmptyComponent={<Text style={styles.empty}>Find a track in Search and tap Download to add it here.</Text>}
      renderItem={({ item }) => {
        const failed = item.job.status === 'failed' || item.transfer === 'failed';
        const track = tracks.find((song) => song.fileState !== 'missing' && (song.id === `service-${item.job.id}` || matchesCatalog(song, item.job.metadata)));
        const available = !!track && track.fileState !== 'missing';
        const selected = playback.track?.id === track?.id;
        const label = item.transfer === 'saved' ? available ? null : 'Audio file missing' : item.transfer === 'failed' ? 'Could not save to device' : statusLabels[item.job.status];
        return <View style={styles.card}>
          <View style={styles.row}><Artwork uri={track?.artworkUri ?? item.job.metadata.coverUrl} size={theme.size.smallControl} square /><View style={styles.trackText}><Text numberOfLines={1} style={styles.title}>{item.job.metadata.title || 'Queued recording'}</Text><Text numberOfLines={1} style={styles.muted}>{item.job.metadata.artist}</Text></View>
            <IconButton family="material-community" icon="playlist-plus" label={`Add ${item.job.metadata.title} to playlist`} disabled={!available || !playlists.ready} onPress={() => { if (track) (onAddToPlaylist ?? setPlaylistTrack)(track); }} />
            <RoundButton icon={selected && playback.playing ? 'pause' : 'play'} label={`${selected && playback.playing ? 'Pause' : 'Play'} ${item.job.metadata.title}`} size="track" filled active disabled={!available} onPress={() => { if (!track) return; if (selected) { if (!playback.playing) playback.recordSelection(track.id); playback.toggle(); } else playback.selectTrack(track); }} />
          </View>
          {label && <Text style={[styles.status, failed && styles.error]}>{label}</Text>}
          {failed && <Text style={styles.muted}>{item.transferError || item.job.error || 'Please try again.'}</Text>}
          {failed && <Pressable accessibilityRole="button" disabled={busy !== null} onPress={async () => {
            setBusy(item.job.id); setRetryError(null);
            try { await retry(item); } catch { setRetryError('Could not retry this download. Please try again.'); }
            finally { setBusy(null); }
          }} style={styles.retry}><Text style={styles.retryLabel}>{busy === item.job.id ? 'Retrying…' : 'Retry download'}</Text></Pressable>}
        </View>;
      }} />
    {playlistTrack && <SongActions key={playlistTrack.id} track={playlistTrack} initialMode="playlists" onClose={() => setPlaylistTrack(undefined)} />}
  </>;
}

const createStyles = (theme: Theme) => ({
  page: { flex: 1 },
  drawer: { maxHeight: theme.size.panelHeight / 2, flexGrow: 0, flexShrink: 1 },
  list: { paddingTop: theme.space.md, gap: theme.space.md },
  card: { paddingVertical: theme.space.sm, gap: theme.space.sm },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm },
  trackText: { flex: 1, minWidth: 0, gap: theme.space.xs },
  title: { ...theme.type.body, color: theme.colors.text },
  muted: { ...theme.type.caption, color: theme.colors.muted },
  status: { ...theme.type.action, color: theme.colors.accent },
  error: { ...theme.type.body, color: theme.colors.error },
  empty: { ...theme.type.body, color: theme.colors.muted, textAlign: 'center' as const, paddingVertical: theme.space.section },
  retry: { alignSelf: 'flex-start' as const, paddingVertical: theme.space.sm, paddingHorizontal: theme.space.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, boxShadow: theme.shadows.raised },
  retryLabel: { ...theme.type.action, color: theme.colors.accent },
});
