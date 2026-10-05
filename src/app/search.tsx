import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Artwork } from '../components/Artwork';
import { DownloadsDrawer } from '../components/DownloadsList';
import { FilterChips } from '../components/FilterChips';
import { IconButton, RoundButton } from '../components/Matte';
import { Screen } from '../components/Screen';
import { SongActions } from '../components/SongActions';
import { SongRow } from '../components/SongRow';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { defaultServiceUrl, loadServiceUrl, searchTracks } from '../services/music-service';
import { useDownloads } from '../state/DownloadsProvider';
import { useLibrary } from '../state/LibraryProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { CatalogTrack, Track } from '../types/music';
import { catalogIdentity, matchesCatalog, sameCatalog } from '../utils/catalog';
import { pendingDownloadCount } from '../utils/downloads';

const filters = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'] as const;
type Filter = typeof filters[number];
type Result = { id: string; title: string; subtitle: string; artwork?: string; track?: Track; catalog?: CatalogTrack; kind?: 'artist' | 'album' | 'playlist'; artist?: string; playlistId?: string };
export default function SearchScreen() {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const { tracks } = useLibrary();
  const { playlists } = usePlaylists();
  const downloads = useDownloads();
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  const recent = useRecentSearches();
  const rememberSearches = recent.remember;
  const pendingDownloads = pendingDownloadCount(downloads.entries);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogTrack[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [song, setSong] = useState<{ track?: Track; catalog?: CatalogTrack }>();
  const [busy, setBusy] = useState<string>();
  const [serviceUrl, setServiceUrl] = useState(defaultServiceUrl);
  const [serviceReady, setServiceReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<TextInput>(null);
  const reveal = useSharedValue(0);
  const request = useRef<AbortController | null>(null);
  const submitted = useRef('');
  const nextOffset = useRef(0);
  useFocusEffect(useCallback(() => {
    request.current?.abort();
    setFilter('All'); setSearchOpen(false); setQuery(''); setResults([]); setLoading(false); setOffset(0); setTotal(0); setSearched(false); setError(null); setNotice(null);
    return () => { request.current?.abort(); };
  }, []));
  useEffect(() => navigation.addListener('tabPress', () => setFilter('All')), [navigation]);
  useEffect(() => {
    reveal.value = withTiming(searchOpen ? 1 : 0, { duration: 280, easing: Easing.inOut(Easing.cubic) });
    if (searchOpen) searchInput.current?.focus(); else searchInput.current?.blur();
  }, [searchOpen, reveal]);
  const searchReveal = useAnimatedStyle(() => ({ height: reveal.value * (theme.size.smallControl + theme.space.md), opacity: reveal.value }));
  const searchMotion = useAnimatedStyle(() => ({ transform: [{ translateY: (reveal.value - 1) * theme.space.md }] }));
  useEffect(() => {
    let active = true;
    void loadServiceUrl().then((url) => { if (active) { setServiceUrl(url); setServiceReady(true); } }).catch(() => { if (active) setError('Could not restore the music service address.'); });
    return () => { active = false; request.current?.abort(); };
  }, []);
  function saved(catalog: CatalogTrack) { return tracks.find((track) => track.fileState !== 'missing' && matchesCatalog(track, catalog)); }
  const items = useMemo<Result[]>(() => {
    const match = query.trim().toLocaleLowerCase();
    const history = recent.songs.flatMap((song): Result[] => {
      const track = tracks.find((item) => item.fileState !== 'missing' && (song.catalog ? matchesCatalog(item, song.catalog) : item.id === song.trackId));
      if (!song.catalog) return track ? [{ id: track.id, title: track.title, subtitle: track.artist, artwork: track.artworkUri, track }] : [];
      return [{ id: track?.id ?? catalogIdentity(song.catalog), title: song.catalog.title, subtitle: song.catalog.artist, artwork: track?.artworkUri ?? song.catalog.coverUrl, catalog: song.catalog, track }];
    }).filter((song, index, all) => all.findIndex((item) => item.id === song.id) === index);
    const songs: Result[] = match ? results.map((catalog) => {
      const track = tracks.find((item) => item.fileState !== 'missing' && matchesCatalog(item, catalog));
      return { id: catalogIdentity(catalog), title: catalog.title, subtitle: catalog.artist, artwork: catalog.coverUrl, catalog, track };
    }) : history;
    const groups = (kind: 'artist' | 'album') => {
      const grouped = new Map<string, Result>();
      for (const song of songs) {
        const name = kind === 'artist' ? song.subtitle : (song.track?.album ?? song.catalog?.album);
        if (!name) continue;
        const artist = kind === 'album' ? song.subtitle : undefined;
        const id = JSON.stringify([kind, name, artist]);
        const existing = grouped.get(id);
        if (!existing) grouped.set(id, { id, title: name, subtitle: artist ?? 'Artist', artwork: song.artwork, kind, artist, catalog: song.catalog });
        else if (song.catalog && !existing.catalog) existing.catalog = song.catalog;
      }
      return [...grouped.values()];
    };
    const matchingPlaylists: Result[] = match ? playlists.filter((playlist) => playlist.name.toLocaleLowerCase().includes(match)).map((playlist) => ({ id: playlist.id, playlistId: playlist.id, title: playlist.name, subtitle: `${playlist.trackIds.length} songs · Playlist`, kind: 'playlist', artwork: tracks.find((track) => playlist.trackIds.includes(track.id) && track.artworkUri)?.artworkUri })) : [];
    return filter === 'Playlists' ? matchingPlaylists : filter === 'Artists' ? groups('artist') : filter === 'Albums' ? groups('album') : filter === 'All' && match ? [...songs, ...groups('artist'), ...groups('album'), ...matchingPlaylists] : songs;
  }, [query, tracks, results, filter, playlists, recent.songs]);
  const search = useCallback(async (more = false) => {
    const text = more ? submitted.current : query.trim();
    if (text.length < 2) { setError('Enter at least two characters to search.'); return; }
    request.current?.abort(); setError(null); setNotice(null);
    if (filter === 'Playlists') { setLoading(false); setSearched(true); return; }
    const controller = new AbortController(); request.current = controller;
    if (!more) { submitted.current = text; setResults([]); setOffset(0); nextOffset.current = 0; setTotal(0); }
    setLoading(true);
    try {
      const response = await searchTracks(serviceUrl, text, more ? nextOffset.current : 0, controller.signal);
      if (controller.signal.aborted) return;
      setResults((current) => [...new Map((more ? [...current, ...response.tracks] : response.tracks).map((track) => [catalogIdentity(track), track])).values()]); nextOffset.current = response.offset + response.tracks.length; setOffset(nextOffset.current); setTotal(response.count); setSearched(true);
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not search.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [query, filter, serviceUrl]);
  useEffect(() => {
    if (!serviceReady || query.trim().length < 2) return;
    const timer = setTimeout(() => { void search(); }, 350);
    return () => { clearTimeout(timer); request.current?.abort(); };
  }, [query, serviceReady, search]);
  async function download(catalog: CatalogTrack, play = false) {
    if (busy) throw new Error('A song is already being queued. Please wait.');
    rememberSearches([{ catalog }]);
    setBusy(catalogIdentity(catalog)); setError(null);
    try { await downloads.queue(serviceUrl, catalog, play); setNotice(play ? 'Playback will start when this song is saved on your device.' : 'Song queued. Follow its progress in Downloads.'); }
    finally { setBusy(undefined); }
  }
  function clearSearch() {
    request.current?.abort(); setLoading(false); setQuery(''); setResults([]); setOffset(0); setTotal(0); setSearched(false); setError(null); setNotice(null);
  }
  function openSong(item: Result) {
    rememberSearches([{ catalog: item.catalog, trackId: item.track?.id }]);
    setSong({ track: item.track, catalog: item.catalog });
  }
  return <Screen>
    <View style={styles.header}><Text style={styles.heading}>Search</Text>
      <RoundButton icon={searchOpen ? 'close' : 'search-outline'} label={searchOpen ? 'Hide search' : 'Show search'} size="track" onPress={() => { if (searchOpen) clearSearch(); setSearchOpen((value) => !value); }} />
      <View><RoundButton icon="download-outline" label={`Downloads, ${pendingDownloads} in queue`} size="track" onPress={() => { searchInput.current?.blur(); setDownloadsOpen(true); }} />{pendingDownloads > 0 && <View pointerEvents="none" style={styles.badge}><Text style={styles.badgeText}>{pendingDownloads > 99 ? '99+' : pendingDownloads}</Text></View>}</View>
    </View>
    <Animated.View pointerEvents={searchOpen ? 'auto' : 'none'} aria-hidden={!searchOpen} accessibilityElementsHidden={!searchOpen} importantForAccessibility={searchOpen ? 'auto' : 'no-hide-descendants'} style={[styles.searchReveal, searchReveal]}>
      <Animated.View style={[styles.search, focused && styles.focusedSearch, searchMotion]}>
        <TextInput ref={searchInput} editable={searchOpen} accessibilityLabel="Song or artist" value={query} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChangeText={(text) => { request.current?.abort(); setLoading(false); setQuery(text); setResults([]); setOffset(0); setTotal(0); setSearched(false); setError(null); }} onSubmitEditing={() => { void search(); }} returnKeyType="search" autoCapitalize="none" autoCorrect={false} placeholder="Songs, artists, albums…" placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.accent} style={styles.input} />
        {!!query && <IconButton icon="close" label="Clear search" onPress={clearSearch} />}
        <IconButton icon={loading ? 'hourglass-outline' : 'search-outline'} label={loading ? 'Searching music' : 'Search music'} disabled={!searchOpen || loading || !serviceReady} onPress={() => { void search(); }} />
      </Animated.View>
    </Animated.View>
    <FilterChips options={filters} selected={filter} onSelect={setFilter} />
    {(error || recent.error) && <Text accessibilityRole="alert" style={styles.error}>{error || recent.error}</Text>}
    {notice && <Pressable accessibilityRole="button" accessibilityLabel="View downloads" onPress={() => setDownloadsOpen(true)}><Text style={styles.notice}>{notice}</Text></Pressable>}
    <FlatList data={items} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomInset }}
      ListHeaderComponent={!query.trim() && items.length > 0 ? <Text style={styles.recentTitle}>Recent searches</Text> : null}
      ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="search-outline" size={theme.size.control} color={theme.colors.border} /><Text style={styles.emptyTitle}>{loading ? 'Finding your music' : query.trim().length < 2 ? 'Find your next favorite' : searched ? 'No matches yet' : 'Searching…'}</Text><Text style={styles.empty}>{query.trim().length < 2 ? 'Search for a song or artist. Songs you choose appear here.' : searched && !loading ? 'Try another song or artist name.' : 'Searching your library and more.'}</Text></View>}
      renderItem={({ item }) => item.kind ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => router.push({ pathname: '/collection', params: item.kind === 'playlist' ? { kind: 'playlist', id: item.playlistId } : { kind: item.kind, name: item.title, artist: item.artist ?? '', catalog: item.catalog ? '1' : '0' } })} style={styles.row}><Artwork uri={item.artwork} square /><View style={styles.details}><Text numberOfLines={1} style={styles.title}>{item.title}</Text><Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={theme.size.smallIcon} color={theme.colors.muted} /></Pressable> : item.track ? <SongRow track={item.track} onSelect={() => rememberSearches([{ catalog: item.catalog, trackId: item.track!.id }])} onOptions={() => openSong(item)} /> : <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={`Options for ${item.title}`} onPress={() => openSong(item)} style={styles.songDetails}><Artwork uri={item.artwork} square /><View style={styles.details}><Text numberOfLines={1} style={styles.title}>{item.title}</Text><Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text></View></Pressable>
        <IconButton icon="cloud-download-outline" label={`Download ${item.title}`} active disabled={!downloads.ready || !!busy || downloads.entries.some((entry) => entry.serviceUrl === serviceUrl && item.catalog && sameCatalog(entry.job.metadata, item.catalog) && entry.job.status !== 'failed' && entry.transfer !== 'failed' && entry.transfer !== 'saved')} onPress={() => { if (item.catalog) void download(item.catalog).catch((error) => setError(error instanceof Error ? error.message : 'Could not queue this song.')); }} />
        <IconButton icon="ellipsis-vertical" label={`More options for ${item.title}`} onPress={() => openSong(item)} />
      </View>}
      ListFooterComponent={offset < total && filter !== 'Playlists' ? <Pressable accessibilityRole="button" disabled={loading} onPress={() => { void search(true); }} style={styles.more}><Text style={styles.notice}>{loading ? 'Loading…' : 'Load more'}</Text></Pressable> : null} />
    <SongActions track={song?.track ?? (song?.catalog ? saved(song.catalog) : undefined)} catalog={song?.catalog} onClose={() => setSong(undefined)} onDownload={song?.catalog ? (play) => download(song.catalog!, play) : undefined} />
    <DownloadsDrawer visible={downloadsOpen} onClose={() => setDownloadsOpen(false)} />
  </Screen>;
}
const createStyles = (theme: Theme) => ({
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm },
  heading: { ...theme.type.heading, color: theme.colors.text, flex: 1 },
  badge: { position: 'absolute' as const, top: -theme.space.xs, right: -theme.space.xs, minWidth: theme.space.lg, height: theme.space.lg, borderRadius: theme.radius.pill, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.colors.accent, paddingHorizontal: theme.space.xs },
  badgeText: { ...theme.type.time, fontWeight: '700' as const, color: theme.colors.onAccent },
  searchReveal: { overflow: 'hidden' as const },
  search: { height: theme.size.smallControl + theme.space.sm, marginTop: theme.space.sm, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.highlight, padding: theme.space.xs },
  focusedSearch: { borderColor: theme.colors.accent },
  input: { ...theme.type.body, flex: 1, minWidth: 0, color: theme.colors.text, paddingHorizontal: theme.space.sm, paddingVertical: theme.space.sm, outlineWidth: 0, outlineStyle: 'solid' as const },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs, minHeight: theme.size.track + theme.space.sm, paddingVertical: theme.space.sm },
  songDetails: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  details: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  subtitle: { ...theme.type.caption, color: theme.colors.muted },
  emptyState: { alignItems: 'center' as const, gap: theme.space.md, paddingHorizontal: theme.space.lg, paddingTop: theme.space.section },
  emptyTitle: { ...theme.type.title, color: theme.colors.text, textAlign: 'center' as const },
  empty: { ...theme.type.body, color: theme.colors.muted, textAlign: 'center' as const },
  more: { paddingVertical: theme.space.lg, alignItems: 'center' as const },
  notice: { ...theme.type.caption, color: theme.colors.accent, marginBottom: theme.space.sm },
  error: { ...theme.type.caption, color: theme.colors.error, marginBottom: theme.space.md },
  recentTitle: { ...theme.type.title, color: theme.colors.text, marginBottom: theme.space.sm },
});
