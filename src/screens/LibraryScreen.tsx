import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Artwork } from '../components/Artwork';
import { ExpandableSearch } from '../components/ExpandableSearch';
import { PlaylistSettings } from '../components/PlaylistSettings';
import { FilterChips } from '../components/FilterChips';
import { IconButton, RoundButton } from '../components/Matte';
import { PlaylistEditor } from '../components/PlaylistEditor';
import { Screen } from '../components/Screen';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { SongActions } from '../components/SongActions';
import { SongRow } from '../components/SongRow';
import { useLibrary } from '../state/LibraryProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Track } from '../types/music';
import { groupTracks } from '../utils/collections';

const filters = ['Playlists', 'Artists', 'Albums', 'Songs'] as const;
type Filter = typeof filters[number];
type Item = { id: string; title: string; subtitle: string; artwork?: string; track?: Track; kind?: 'playlist' | 'artist' | 'album'; artist?: string };
export default function LibraryScreen() {
  const { tracks, ready, error: libraryError } = useLibrary();
  const playlists = usePlaylists();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const [filter, setFilter] = useState<Filter>('Playlists');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [alphabetical, setAlphabetical] = useState(false);
  const [editor, setEditor] = useState<string | true | null>(null);
  const [song, setSong] = useState<Track>();
  const [playlistOptions, setPlaylistOptions] = useState<string>();
  const items = useMemo<Item[]>(() => {
    let data: Item[];
    if (filter === 'Songs') data = [...tracks].reverse().map((track) => ({ id: track.id, title: track.title, subtitle: track.artist, track }));
    else if (filter === 'Artists' || filter === 'Albums') data = groupTracks(tracks, filter === 'Artists' ? 'artist' : 'album').map((group) => ({ id: group.id, title: group.name, subtitle: `${group.artist ? group.artist + ' · ' : ''}${group.tracks.length} songs`, artwork: group.tracks.find((track) => track.artworkUri)?.artworkUri, artist: group.artist, kind: filter === 'Artists' ? 'artist' : 'album' }));
    else data = [...playlists.playlists].sort((a, b) => b.createdAt - a.createdAt).map((playlist) => ({ id: playlist.id, title: playlist.name, subtitle: `${playlist.trackIds.filter((id) => tracks.some((track) => track.id === id)).length} songs`, kind: 'playlist', artwork: tracks.find((track) => playlist.trackIds.includes(track.id) && track.artworkUri)?.artworkUri }));
    return data.filter((item) => `${item.title} ${item.subtitle}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => alphabetical ? a.title.localeCompare(b.title) : 0);
  }, [filter, tracks, playlists.playlists, query, alphabetical]);
  const open = (item: Item) => router.push(item.kind === 'artist' ? { pathname: '/artist', params: { name: item.title } } : { pathname: '/collection', params: item.kind === 'playlist' ? { kind: 'playlist', id: item.id } : { kind: item.kind, name: item.title, artist: item.artist ?? '' } });
  return <Screen>
    <View style={styles.header}><Text style={styles.heading}>Library</Text><ExpandableSearch open={searchOpen} onOpenChange={setSearchOpen} query={query} onChangeText={setQuery} onClear={() => setQuery('')} onSearch={() => searchInput.current?.focus()} inputRef={searchInput} inputLabel="Search your library" showLabel="Search your library" searchLabel="Search your library" clearLabel="Clear library search" hideLabel="Hide library search" /><RoundButton icon="add" label="Add to library" size="track" disabled={!playlists.ready} onPress={() => { searchInput.current?.blur(); setEditor(true); }} /></View>
    <FilterChips options={filters} selected={filter} onSelect={setFilter} />
    <View style={styles.sort}><Text style={styles.subtitle}>{alphabetical ? 'A–Z' : 'Recent'}</Text><IconButton icon="filter-outline" label={alphabetical ? 'Sort by recent' : 'Sort alphabetically'} onPress={() => setAlphabetical((value) => !value)} /></View>
    {(libraryError || playlists.error) && <Text accessibilityRole="alert" style={styles.error}>{libraryError || playlists.error}</Text>}
    <FlatList style={{ marginHorizontal: -theme.layout.contentInset }} data={items} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={[!items.length && styles.empty, { paddingBottom: bottomInset, paddingHorizontal: theme.layout.contentInset }]} ListEmptyComponent={<Text style={styles.emptyText}>{query ? 'No matches in your library.' : !ready ? 'Opening your library…' : filter === 'Albums' ? 'Albums appear when songs include album information.' : filter === 'Artists' ? 'Add songs to see your artists here.' : 'Add your favorite songs to get started.'}</Text>}
      renderItem={({ item }) => item.track ? <SongRow track={item.track} onOptions={() => setSong(item.track)} /> : <View style={styles.collection}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => open(item)} style={styles.details}>{item.id === 'liked' ? <View style={styles.liked}><Ionicons name="heart" size={theme.size.icon} color={theme.colors.text} /></View> : <Artwork uri={item.artwork} square />}<View style={styles.metadata}><Text numberOfLines={1} style={styles.title}>{item.title}</Text><Text numberOfLines={1} style={styles.caption}>{item.subtitle}</Text></View></Pressable>{item.kind === 'playlist' && <IconButton icon="ellipsis-vertical" label={`Options for ${item.title}`} onPress={() => setPlaylistOptions(item.id)} />}</View>} />
    <SongActions track={song} onClose={() => setSong(undefined)} />
    <PlaylistSettings playlistId={playlistOptions} onClose={() => setPlaylistOptions(undefined)} />
    {editor && <PlaylistEditor playlistId={typeof editor === 'string' ? editor : undefined} onClose={() => setEditor(null)} />}
  </Screen>;
}
const createStyles = (theme: Theme) => ({
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  heading: { ...theme.type.heading, color: theme.colors.text },
  sort: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: theme.space.md },
  subtitle: { ...theme.type.action, color: theme.colors.text },
  collection: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, minHeight: theme.size.track + theme.space.sm, paddingVertical: theme.space.sm },
  details: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  metadata: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  liked: { width: theme.size.thumbnail, height: theme.size.thumbnail, borderRadius: theme.radius.card / 2, backgroundColor: theme.colors.surface, boxShadow: theme.shadows.raised, alignItems: 'center' as const, justifyContent: 'center' as const },
  action: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, minHeight: theme.size.track },
  empty: { flexGrow: 1, justifyContent: 'center' as const },
  emptyText: { ...theme.type.body, color: theme.colors.muted, textAlign: 'center' as const, padding: theme.space.lg },
  error: { ...theme.type.caption, color: theme.colors.error, marginBottom: theme.space.md },
});
