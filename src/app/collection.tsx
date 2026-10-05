import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Share, Text, View } from 'react-native';

import { Artwork } from '../components/Artwork';
import { BottomSheet } from '../components/BottomSheet';
import { IconButton, RoundButton } from '../components/Matte';
import { PageHeader } from '../components/PageHeader';
import { PlaylistEditor } from '../components/PlaylistEditor';
import { Screen } from '../components/Screen';
import { SongActions } from '../components/SongActions';
import { SongRow } from '../components/SongRow';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { loadServiceUrl, searchTracks } from '../services/music-service';
import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { CatalogTrack, Track } from '../types/music';
import { catalogIdentity, matchesCatalog } from '../utils/catalog';
import { formatTime } from '../utils/playback';
import { PlaylistArtwork } from '../components/PlaylistArtwork';
import { PlaylistSettings } from '../components/PlaylistSettings';

export default function CollectionScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string; name?: string; artist?: string; catalog?: string }>();
  const { tracks } = useLibrary();
  const playlists = usePlaylists();
  const playback = usePlayback();
  const downloads = useDownloads();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const playlist = playlists.playlists.find((item) => item.id === params.id);
  const title = params.kind === 'playlist' ? playlist?.name ?? 'Playlist' : params.kind === 'recent' ? 'Recently Played' : params.kind === 'added' ? 'Recently Added' : params.name ?? 'Collection';
  const key = JSON.stringify([params.kind, params.name, params.artist, params.catalog]);
  const [response, setResponse] = useState<{ key: string; results: CatalogTrack[]; service: string; failed?: string }>();
  const [editor, setEditor] = useState(false);
  const [options, setOptions] = useState(false);
  const [song, setSong] = useState<{ track?: Track; catalog?: CatalogTrack }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localTracks = useMemo(() => params.kind === 'playlist' ? (playlist?.trackIds ?? []).map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => !!track) : params.kind === 'recent' ? playback.recentlyPlayed.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => !!track) : params.kind === 'added' ? [...tracks].reverse() : tracks.filter((track) => params.kind === 'artist' ? track.artist === params.name : track.album === params.name && (!params.artist || track.artist === params.artist)), [params.kind, params.name, params.artist, playlist, tracks, playback.recentlyPlayed]);
  useEffect(() => {
    if (params.catalog !== '1' || !params.name) return;
    const controller = new AbortController();
    void loadServiceUrl().then(async (service) => {
      const result = await searchTracks(service, `${params.artist ?? ''} ${params.name}`.trim(), 0, controller.signal);
      if (controller.signal.aborted) return;
      const match = (value?: string) => value?.trim().toLocaleLowerCase();
      const results = result.tracks.filter((track) => params.kind === 'artist' ? match(track.artist) === match(params.name) : match(track.album) === match(params.name) && (!params.artist || match(track.artist) === match(params.artist)));
      setResponse({ key, results, service });
    }).catch((error) => { if (!controller.signal.aborted) setResponse({ key, results: [], service: '', failed: error instanceof Error ? error.message : 'Could not load this collection.' }); });
    return () => controller.abort();
  }, [key, params.catalog, params.name, params.artist, params.kind]);
  const catalogTracks = response?.key === key ? response.results.filter((catalog) => !localTracks.some((track) => matchesCatalog(track, catalog))) : [];
  const items = [...localTracks.map((track) => ({ id: track.id, track, catalog: undefined as CatalogTrack | undefined })), ...catalogTracks.map((catalog) => ({ id: catalogIdentity(catalog), catalog, track: undefined as Track | undefined }))];
  const artwork = localTracks.find((track) => track.artworkUri)?.artworkUri ?? catalogTracks.find((track) => track.coverUrl)?.coverUrl;
  const duration = (localTracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0) + catalogTracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0)) / 1000;
  async function download(catalog: CatalogTrack, play = false) {
    if (!response?.service) throw new Error('The music service is unavailable.');
    await downloads.queue(response.service, catalog, play);
  }
  function play(shuffled = false) {
    if (localTracks.length) { playback.playCollection(localTracks, undefined, shuffled); router.push('/now-playing'); }
    else if (catalogTracks.length) { setBusy(true); void download(catalogTracks[0], true).catch((error) => setError(error instanceof Error ? error.message : 'Could not queue this song.')).finally(() => setBusy(false)); }
  }
  return <Screen>
    <FlatList data={items} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}
      ListHeaderComponent={<><View style={styles.header}><View style={styles.back}><PageHeader title="" backTo="/library" /></View>{params.kind !== 'playlist' && <RoundButton icon="ellipsis-vertical" label="Collection options" onPress={() => setOptions(true)} />}</View>
        <View style={styles.hero}>{playlist ? <PlaylistArtwork playlist={playlist} size={theme.size.albumArtwork + theme.space.xl} /> : <Artwork uri={artwork} square size={theme.size.albumArtwork + theme.space.xl} />}<Text style={styles.heading}>{title}</Text><Text style={styles.caption}>{items.length} {items.length === 1 ? 'song' : 'songs'}{duration > 0 ? ` · ${formatTime(duration)}` : ''}</Text></View>
        <View style={styles.controls}>{playlist && <RoundButton icon="add" label="Add songs to playlist" disabled={!playlists.ready} onPress={() => setEditor(true)} />}{playlist && <RoundButton icon="shuffle" label={`Shuffle ${title}`} disabled={!localTracks.length || busy} onPress={() => play(true)} />}{params.catalog === '1' && <RoundButton icon="cloud-download-outline" label="Download collection songs" disabled={!catalogTracks.length || busy || !downloads.ready} onPress={() => { setBusy(true); setError(null); void (async () => { for (const song of catalogTracks) await download(song); })().catch((error) => setError(error instanceof Error ? error.message : 'Could not queue this collection.')).finally(() => setBusy(false)); }} />}<RoundButton icon="play" label={`Play ${title}`} filled active disabled={!items.length || busy} onPress={() => play()} />{playlist && <RoundButton icon="settings-outline" label="Playlist settings" onPress={() => setOptions(true)} />}</View>
        {(error || response?.key === key && response.failed) && <Text accessibilityRole="alert" style={styles.error}>{error ?? response?.failed}</Text>}
      </>}
      ListEmptyComponent={<Text style={styles.empty}>{params.catalog === '1' && response?.key !== key ? 'Loading songs…' : params.kind === 'playlist' ? 'Add songs to make this playlist yours.' : 'No songs in this collection yet.'}</Text>}
      renderItem={({ item }) => item.track ? <SongRow track={item.track} collection={localTracks} onOptions={() => setSong({ track: item.track })} /> : <View style={styles.row}><Artwork uri={item.catalog?.coverUrl} square /><View style={styles.details}><Text numberOfLines={1} style={styles.title}>{item.catalog?.title}</Text><Text numberOfLines={1} style={styles.caption}>{item.catalog?.artist}</Text></View><RoundButton icon="play" label={`Play ${item.catalog?.title}`} size="track" disabled={busy} onPress={() => { if (item.catalog) void download(item.catalog, true).catch((error) => setError(error instanceof Error ? error.message : 'Could not queue this song.')); }} /><IconButton icon="ellipsis-vertical" label={`Options for ${item.catalog?.title}`} onPress={() => setSong({ catalog: item.catalog })} /></View>} />
    <SongActions track={song?.track} catalog={song?.catalog} onClose={() => setSong(undefined)} onDownload={song?.catalog ? (play) => download(song.catalog!, play) : undefined} />
    {editor && playlist && <PlaylistEditor playlistId={playlist.id} onClose={() => setEditor(false)} />}
    <PlaylistSettings playlistId={options && playlist ? playlist.id : undefined} onClose={() => setOptions(false)} onRemoved={() => router.replace('/library')} />
    <BottomSheet visible={options && !playlist} title={title} onClose={() => setOptions(false)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Share collection" onPress={() => { void Share.share({ message: `${title}\n${items.map((item) => `${item.track?.title ?? item.catalog?.title} — ${item.track?.artist ?? item.catalog?.artist}`).join('\n')}` }).then(() => setOptions(false)).catch(() => setError('Sharing is unavailable on this device.')); }} style={styles.action}><Ionicons name="share-outline" size={theme.size.icon} color={theme.colors.text} /><Text style={styles.title}>Share</Text></Pressable>
    </BottomSheet>
  </Screen>;
}
const createStyles = (theme: Theme) => ({
  header: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const },
  back: { flex: 1 },
  hero: { alignItems: 'center' as const, gap: theme.space.md, marginBottom: theme.space.xl },
  heading: { ...theme.type.heading, color: theme.colors.text, textAlign: 'center' as const },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  title: { ...theme.type.body, color: theme.colors.text },
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-evenly' as const, gap: theme.space.sm, marginBottom: theme.space.xl },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, minHeight: theme.size.track + theme.space.sm },
  details: { flex: 1, minWidth: 0 },
  action: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, paddingVertical: theme.space.md },
  empty: { ...theme.type.body, color: theme.colors.muted, textAlign: 'center' as const, paddingVertical: theme.space.xl },
  error: { ...theme.type.caption, color: theme.colors.error, marginBottom: theme.space.md },
});
