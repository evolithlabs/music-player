import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';

import { usePlayback } from '../state/PlaybackProvider';
import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { CatalogTrack, Track } from '../types/music';
import { matchesCatalog } from '../utils/catalog';
import { SongArtist } from './SongArtist';
import { Artwork } from './Artwork';
import { BottomSheet } from './BottomSheet';

type Props = { track?: Track; catalog?: CatalogTrack; onClose: () => void; onRemoved?: () => void; onDownload?: (play: boolean) => Promise<void>; onRetryLyrics?: () => void; initialMode?: 'actions' | 'playlists' };
export function SongActions({ track, catalog, onClose, onRemoved, onDownload, onRetryLyrics, initialMode = 'actions' }: Props) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const playback = usePlayback();
  const playlists = usePlaylists();
  const downloads = useDownloads();
  const library = useLibrary();
  const [mode, setMode] = useState<'actions' | 'playlists' | 'create'>(initialMode);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const song = track ?? catalog;
  const selected = !!playback.track && (track?.id === playback.track.id || !!catalog && matchesCatalog(playback.track, catalog));
  const localTrack = track?.stream ? library.tracks.find((item) => item.id === track.id) : track;
  const missing = track?.fileState === 'missing';
  const restoreJob = missing && track?.origin === 'service' ? downloads.entries.find((entry) => `service-${entry.job.id}` === track.id) : undefined;
  const downloadSong = onDownload ?? (track?.stream ? (play: boolean) => downloads.queue(track.stream!.serviceUrl, track.stream!.metadata, play) : restoreJob ? (play: boolean) => downloads.queue(restoreJob.serviceUrl, restoreJob.job.metadata, play) : undefined);
  const close = () => { setMode(initialMode); setName(''); setError(null); onClose(); };
  async function run(action: () => Promise<void> | void) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); close(); } catch (error) { setError(error instanceof Error ? error.message : 'Could not complete this action.'); }
    finally { setBusy(false); }
  }
  const row = (icon: ComponentProps<typeof Ionicons>['name'] | 'playlist-plus', label: string, action: () => void, disabled = false, caption?: string) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} disabled={disabled || busy} onPress={action} style={[styles.row, (disabled || busy) && styles.disabled]}>{icon === 'playlist-plus' ? <MaterialCommunityIcons name={icon} size={theme.size.icon} color={theme.colors.text} /> : icon === 'download' ? <Feather name="download" size={theme.size.icon} color={theme.colors.accent} /> : <Ionicons name={icon} size={theme.size.icon} color={icon === 'trash-outline' ? theme.colors.error : theme.colors.text} />}<View style={styles.details}><Text style={[styles.label, icon === 'trash-outline' && { color: theme.colors.error }]}>{label}</Text>{caption && <Text style={styles.caption}>{caption}</Text>}</View></Pressable>;
  return <BottomSheet visible={!!song} onClose={close} title={mode === 'actions' ? 'Song options' : mode === 'create' ? 'New playlist' : 'Add to playlist'}>
    {song && <View style={styles.song}><Artwork uri={track?.artworkUri ?? catalog?.coverUrl} square /><View style={styles.details}><Text numberOfLines={1} style={[styles.label, selected && styles.activeTitle]}>{song.title}</Text><SongArtist linkArtist onNavigate={close} artist={song.artist} trackId={song.deezerId} durationMs={song.durationMs} duration={track && playback.track?.id === track.id ? playback.duration : 0} />{catalog?.disambiguation && <Text style={styles.caption}>{catalog.disambiguation}</Text>}</View></View>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {mode === 'actions' && song && <>
      {(!localTrack || missing && track?.origin === 'service') && row('download', missing ? 'Download again' : 'Download', () => { void run(() => downloadSong?.(false)); }, !downloadSong, 'Save for offline listening')}
      {row('play', 'Play now', () => { void run(async () => {
        if (track && !missing) { if (playback.track?.id !== track.id) playback.selectTrack(track); else { playback.recordSelection(track.id); if (!playback.playing) playback.toggle(); } router.push('/now-playing'); }
        else await downloadSong?.(true);
      }); }, (!track || missing) && !downloadSong, !localTrack ? 'Listen without saving to your library' : undefined)}
      {row('playlist-plus', 'Add to playlist', () => setMode('playlists'), !localTrack || !playlists.ready, !localTrack ? 'Download this song first' : undefined)}
      {row('albums-outline', 'View album', () => { close(); router.push({ pathname: '/collection', params: { kind: 'album', name: song.album ?? '', artist: song.artist, catalog: '1', id: catalog?.deezerAlbumId?.toString() ?? '', trackId: song.deezerId?.toString() ?? '' } }); }, !song.album)}
      {row('person-outline', 'View artist', () => { close(); router.push({ pathname: '/artist', params: { name: song.artist, trackId: song.deezerId?.toString() ?? '' } }); })}
      {onRetryLyrics && row('document-text-outline', 'Refresh lyrics', () => { onRetryLyrics(); close(); })}
      {row('share-outline', 'Share', () => { void run(async () => {
        const id = track?.catalog?.id ?? catalog?.recordingId;
        const url = catalog?.catalogUrl ?? (track?.deezerId ? `https://www.deezer.com/track/${track.deezerId}` : id ? `https://musicbrainz.org/recording/${id}` : undefined);
        await Share.share({ message: `${song.title} — ${song.artist}${url ? `\n${url}` : ''}` });
      }); })}
      {localTrack && row('trash-outline', 'Remove song', () => { void run(async () => {
        if (playback.track?.id === localTrack.id && playback.playing) playback.toggle();
        await library.remove(localTrack.id);
        await playlists.removeSong(localTrack.id);
        await downloads.forgetSong(localTrack.id);
        onRemoved?.();
      }); }, !library.ready || !playlists.ready || !downloads.ready, localTrack.deviceAssetId ? 'Remove from your library' : 'Delete downloaded audio')}
    </>}
    {mode === 'playlists' && <>{playlists.playlists.map((playlist) => row('musical-notes-outline', playlist.name, () => { if (localTrack) void run(() => playlists.add(playlist.id, [localTrack.id])); }, !localTrack, `${playlist.trackIds.length} songs`))}{row('add', 'New playlist', () => setMode('create'))}</>}
    {mode === 'create' && <><TextInput accessibilityLabel="Playlist name" value={name} onChangeText={setName} placeholder="Playlist name" placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.accent} maxLength={80} style={styles.input} />{row('add', 'Create playlist', () => { void run(async () => { await playlists.create(name); }); }, !name.trim())}</>}
  </BottomSheet>;
}
const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.lg, paddingVertical: theme.space.md, minHeight: theme.size.smallControl },
  details: { flex: 1, gap: theme.space.xs },
  label: { ...theme.type.body, color: theme.colors.text },
  activeTitle: { color: theme.colors.accent },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  song: { flexDirection: 'row' as const, gap: theme.space.md, alignItems: 'center' as const, paddingBottom: theme.space.lg, marginBottom: theme.space.sm, borderBottomWidth: theme.size.border, borderBottomColor: theme.colors.border },
  input: { ...theme.type.body, color: theme.colors.text, padding: theme.space.md, borderRadius: theme.radius.input, backgroundColor: theme.colors.recessed, boxShadow: theme.shadows.inset, outlineWidth: 0, outlineStyle: 'solid' as const },
  disabled: { opacity: theme.opacity.disabled },
  error: { ...theme.type.caption, color: theme.colors.error },
});
