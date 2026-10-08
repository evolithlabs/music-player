import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { getAlbum, getAlbumSongs, getArtist, getArtistAlbums, getArtistSongs, loadServiceUrl } from '../services/music-service';
import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { CatalogAlbum, CatalogArtist, CatalogTrack, Track } from '../types/music';
import { catalogIdentity, matchesCatalog } from '../utils/catalog';
import { formatTime } from '../utils/playback';
import { Artwork } from './Artwork';
import { ArtistLink } from './ArtistLink';
import { CatalogSongRow } from './CatalogSongRow';
import { EmptyShelf } from './EmptyShelf';
import { RoundButton } from './Matte';
import { PageHeader } from './PageHeader';
import { Screen } from './Screen';
import { SongActions } from './SongActions';
import { SongRow } from './SongRow';

type Collection = { key: string; service: string; artist?: CatalogArtist; album?: CatalogAlbum; top: CatalogTrack[]; albums: CatalogAlbum[]; songs: CatalogTrack[]; nextSongs: number | null; nextAlbums: number | null; count: number };
const uniqueSongs = (songs: CatalogTrack[]) => [...new Map(songs.map((song) => [catalogIdentity(song), song])).values()];

export function CatalogCollection({ kind, name, artistName = '', id, trackId }: { kind: 'artist' | 'album'; name: string; artistName?: string; id?: string; trackId?: string }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { tracks } = useLibrary();
  const playback = usePlayback();
  const downloads = useDownloads();
  const bottomInset = useScreenBottomInset();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = width - theme.layout.contentInset * 2 - insets.left - insets.right;
  const pageWidth = Math.max(1, availableWidth - theme.space.xl);
  const cardSize = width >= theme.size.wideBreakpoint ? Math.min(theme.size.albumArtwork, (availableWidth - theme.space.md * 4) / 5) : Math.min(theme.size.albumArtwork - theme.space.xl, availableWidth * 0.34);
  const key = JSON.stringify([kind, name, artistName, id, trackId]);
  const [collection, setCollection] = useState<Collection>();
  const [loading, setLoading] = useState(true);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [error, setError] = useState<string>();
  const [pageError, setPageError] = useState<'songs' | 'albums'>();
  const [attempt, setAttempt] = useState(0);
  const [song, setSong] = useState<CatalogTrack>();
  const [fallbackSong, setFallbackSong] = useState<Track>();
  const [busy, setBusy] = useState(false);
  const pending = useRef(new Set<string>());
  const controller = useRef<AbortController | undefined>(undefined);
  const list = useRef<FlatList<CatalogTrack>>(null);
  const current = collection?.key === key ? collection : undefined;
  const local = tracks.filter((track) => kind === 'artist' ? track.artist === name : track.album === name && (!artistName || track.artist === artistName));
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    pending.current.clear();
    list.current?.scrollToOffset({ offset: 0, animated: false });
    void (async () => {
      const service = await loadServiceUrl();
      const seedTrack = Number(trackId) || undefined;
      if (kind === 'artist') {
        const artist = await getArtist(service, name, seedTrack, request.signal);
        if (request.signal.aborted) return;
        setCollection({ key, service, artist, top: [], albums: [], songs: [], nextSongs: null, nextAlbums: null, count: 0 });
        const sections = await Promise.allSettled([getArtistSongs(service, artist.id, 0, true, request.signal), getArtistAlbums(service, artist.id, 0, request.signal), getArtistSongs(service, artist.id, 0, false, request.signal)]);
        if (request.signal.aborted) return;
        const [top, albums, songs] = sections;
        setCollection({ key, service, artist, top: top.status === 'fulfilled' ? top.value.tracks.slice(0, 12) : [], albums: albums.status === 'fulfilled' ? albums.value.albums : [], songs: songs.status === 'fulfilled' ? songs.value.tracks : [], nextAlbums: albums.status === 'fulfilled' ? albums.value.nextOffset : null, nextSongs: songs.status === 'fulfilled' ? songs.value.nextOffset : null, count: songs.status === 'fulfilled' ? songs.value.count : 0 });
        const failure = sections.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') setError(failure.reason instanceof Error ? failure.reason.message : 'Could not load part of this artist page.');
      } else {
        const album = await getAlbum(service, name, artistName, Number(id) || undefined, seedTrack, request.signal);
        if (request.signal.aborted) return;
        setCollection({ key, service, album, top: [], albums: [], songs: [], nextSongs: null, nextAlbums: null, count: album.trackCount });
        const songs = await getAlbumSongs(service, album.id, 0, request.signal);
        if (!request.signal.aborted) setCollection({ key, service, album, top: [], albums: [], songs: songs.tracks, nextSongs: songs.nextOffset, nextAlbums: null, count: songs.count });
      }
    })().catch((error) => { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load this collection.'); }).finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [key, kind, name, artistName, id, trackId, attempt]);

  async function more(section: 'songs' | 'albums') {
    if (!current || loading || controller.current?.signal.aborted) return;
    const offset = section === 'songs' ? current.nextSongs : current.nextAlbums;
    const requestKey = `${key}:${section}`;
    if (offset === null || pending.current.has(requestKey)) return;
    pending.current.add(requestKey); setPageError(undefined); setError(undefined);
    if (section === 'songs') setLoadingSongs(true); else setLoadingAlbums(true);
    const signal = controller.current?.signal;
    try {
      if (section === 'albums' && current.artist) {
        const page = await getArtistAlbums(current.service, current.artist.id, offset, signal);
        if (!signal?.aborted) setCollection((value) => value?.key === key ? { ...value, albums: [...new Map([...value.albums, ...page.albums].map((album) => [album.id, album])).values()], nextAlbums: page.nextOffset } : value);
      } else {
        const page = current.artist ? await getArtistSongs(current.service, current.artist.id, offset, false, signal) : await getAlbumSongs(current.service, current.album!.id, offset, signal);
        if (!signal?.aborted) setCollection((value) => value?.key === key ? { ...value, songs: uniqueSongs([...value.songs, ...page.tracks]), nextSongs: page.nextOffset, count: page.count } : value);
      }
    } catch (error) { if (!signal?.aborted) { setPageError(section); setError(error instanceof Error ? error.message : 'Could not load more.'); } }
    finally { pending.current.delete(requestKey); if (!signal?.aborted) { if (section === 'songs') setLoadingSongs(false); else setLoadingAlbums(false); } }
  }
  async function download(catalog: CatalogTrack, play = false) {
    if (!current?.service) throw new Error('The music service is unavailable.');
    await downloads.queue(current.service, catalog, play);
  }
  async function downloadAlbum() {
    if (!current?.album || busy) return;
    setBusy(true); setError(undefined);
    const signal = controller.current?.signal;
    try {
      let songs = current.songs;
      let offset = current.nextSongs;
      while (offset !== null && !signal?.aborted) {
        const page = await getAlbumSongs(current.service, current.album.id, offset, signal);
        songs = uniqueSongs([...songs, ...page.tracks]);
        offset = page.nextOffset;
      }
      if (signal?.aborted) return;
      for (const catalog of songs) {
        if (signal?.aborted) return;
        if (!tracks.some((track) => track.fileState !== 'missing' && matchesCatalog(track, catalog))) await download(catalog);
      }
    } catch (error) {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Could not download this album.');
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }
  const title = current?.artist?.name ?? current?.album?.title ?? name;
  const duration = (current?.songs ?? []).reduce((sum, track) => sum + track.durationMs, 0) / 1000;
  const localTrack = song ? tracks.find((track) => track.fileState !== 'missing' && matchesCatalog(track, song)) : undefined;
  const row = (catalog: CatalogTrack, compact = false) => <CatalogSongRow key={catalogIdentity(catalog)} catalog={catalog} serviceUrl={current?.service ?? ''} compact={compact} onOptions={() => setSong(catalog)} />;
  return <Screen><FlatList style={{ marginHorizontal: -theme.layout.contentInset }} ref={list} data={current?.songs ?? []} keyExtractor={catalogIdentity} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset, paddingHorizontal: theme.layout.contentInset }} onEndReachedThreshold={0.5} onEndReached={() => { if (!pageError) void more('songs'); }}
    ListHeaderComponent={<><PageHeader title="" backTo="/library" /><View style={styles.hero}><Artwork uri={current?.artist?.pictureUrl ?? current?.album?.coverUrl ?? local.find((track) => track.artworkUri)?.artworkUri} square size={theme.size.albumArtwork + theme.space.xl} /><Text style={styles.heading}>{title}</Text>
      {current?.album && <><ArtistLink artist={current.album.artist} style={styles.caption} /><Text style={styles.caption}>{current.count} {current.count === 1 ? 'song' : 'songs'}{duration > 0 ? ` · ${formatTime(duration)}` : ''}</Text></>}
    </View>
    {kind === 'album' && <View style={styles.controls}><RoundButton family="feather" icon="download" label={`Download ${title}`} disabled={!current?.songs.length || busy || !downloads.ready} onPress={() => { void downloadAlbum(); }} /><RoundButton icon="play" label={`Play ${title}`} filled active disabled={!current?.songs.length} onPress={() => { if (current?.songs[0]) { router.push('/now-playing'); void playback.playCatalog(current.service, current.songs[0]).catch(() => {}); } }} /></View>}
    {kind === 'artist' && <>
      <View style={styles.section}><Text style={styles.sectionTitle}>Top songs</Text>{current?.top.length ? <ScrollView horizontal pagingEnabled={Platform.OS === 'web'} snapToInterval={pageWidth} decelerationRate="fast" disableIntervalMomentum showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: theme.space.xl }}>{Array.from({ length: Math.ceil(current.top.length / 4) }, (_, page) => <View key={page} accessibilityLabel={`Top songs page ${page + 1}`} style={[styles.picksPage, { width: pageWidth }]}>{current.top.slice(page * 4, page * 4 + 4).map((catalog) => row(catalog, true))}</View>)}</ScrollView> : <Text style={styles.caption}>{loading ? 'Loading top songs…' : 'No top songs available.'}</Text>}</View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Albums</Text>{current?.albums.length ? <FlatList horizontal data={current.albums} keyExtractor={(album) => album.id.toString()} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} onEndReachedThreshold={0.5} onEndReached={() => { if (!pageError) void more('albums'); }} renderItem={({ item: album }) => <AlbumCard album={album} size={cardSize} />} ListFooterComponent={loadingAlbums ? <ActivityIndicator color={theme.colors.accent} /> : null} /> : <EmptyShelf message="No albums available." loadingMessage="Loading albums…" loading={loading} cardSize={cardSize} />}</View>
      <Text style={[styles.sectionTitle, styles.allSongs]}>All songs</Text>
    </>}
    {error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><RoundButton icon="refresh-outline" label="Retry loading collection" onPress={() => { if (pageError) void more(pageError); else { setLoading(true); setError(undefined); setAttempt((value) => value + 1); } }} /></View>}
    </>}
    ListEmptyComponent={loading ? <ActivityIndicator color={theme.colors.accent} /> : error && local.length ? <>{local.map((track) => <SongRow key={track.id} track={track} onOptions={() => setFallbackSong(track)} collection={local} />)}</> : <Text style={styles.empty}>No songs available.</Text>}
    renderItem={({ item }) => row(item)} ListFooterComponent={loadingSongs ? <ActivityIndicator style={styles.loader} color={theme.colors.accent} /> : current?.nextSongs !== null && current?.nextSongs !== undefined ? <Text style={styles.caption}>Scroll to load more songs</Text> : null} />
    <SongActions track={fallbackSong ?? localTrack} catalog={song} onClose={() => { setSong(undefined); setFallbackSong(undefined); }} onDownload={song ? (play) => download(song, play) : undefined} />
  </Screen>;
}

function AlbumCard({ album, size }: { album: CatalogAlbum; size: number }) {
  const styles = useThemeStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open album ${album.title}`} style={{ width: size }} onPress={() => router.push({ pathname: '/collection', params: { kind: 'album', id: album.id.toString(), name: album.title, artist: album.artist, catalog: '1' } })}><Artwork uri={album.coverUrl} square size={size} /><Text numberOfLines={1} style={styles.albumTitle}>{album.title}</Text><Text style={styles.caption}>{album.releaseDate?.slice(0, 4) || 'Album'}</Text></Pressable>;
}

const createStyles = (theme: Theme) => ({
  hero: { alignItems: 'center' as const, gap: theme.space.md, marginBottom: theme.space.xl },
  heading: { ...theme.type.heading, color: theme.colors.text, textAlign: 'center' as const },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  section: { marginTop: theme.space.xl },
  sectionTitle: { ...theme.type.title, color: theme.colors.text, marginBottom: theme.space.md },
  allSongs: { marginTop: theme.space.xl },
  picksPage: { gap: theme.space.md, paddingRight: theme.space.md },
  cards: { gap: theme.space.md, paddingBottom: theme.space.sm },
  albumTitle: { ...theme.type.body, color: theme.colors.text, marginTop: theme.space.sm },
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-evenly' as const, marginBottom: theme.space.xl },
  errorRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm },
  error: { ...theme.type.caption, color: theme.colors.error, flex: 1 },
  empty: { ...theme.type.caption, color: theme.colors.muted, paddingVertical: theme.space.xl },
  loader: { paddingVertical: theme.space.md },
});
