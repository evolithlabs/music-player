import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '../../components/Artwork';
import { IconButton } from '../../components/Matte';
import { EmptyShelf } from '../../components/EmptyShelf';
import { PlaylistArtwork } from '../../components/PlaylistArtwork';
import { Screen } from '../../components/Screen';
import { SongActions } from '../../components/SongActions';
import { SongRow } from '../../components/SongRow';
import { useScreenBottomInset } from '../../hooks/useScreenBottomInset';
import { useLibrary } from '../../state/LibraryProvider';
import { usePlayback } from '../../state/PlaybackProvider';
import { usePlaylists } from '../../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../../state/ThemeProvider';
import { Theme } from '../../theme';
import { Track } from '../../types/music';
import { Playlist } from '../../types/collection';
import { formatTime } from '../../utils/playback';

export default function HomeScreen() {
  const { tracks, ready } = useLibrary();
  const playback = usePlayback();
  const { playlists, ready: playlistsReady } = usePlaylists();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const availableWidth = width - theme.layout.contentInset * 2 - insets.left - insets.right;
  const cardSize = Math.max(1, (availableWidth - theme.space.md * 3) / 3.5);
  const [song, setSong] = useState<Track>();
  const picks = useMemo(() => playback.quickPicks.map((id) => tracks.find((track) => track.id === id && track.fileState !== 'missing')).filter((track): track is Track => !!track).slice(0, 12), [playback.quickPicks, tracks]);
  const picksPageWidth = Math.max(1, availableWidth - (picks.length > 4 ? theme.space.xl : 0));
  const recent = useMemo(() => playback.recentlyPlayed.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => !!track), [playback.recentlyPlayed, tracks]);
  const recentPlaylists = useMemo(() => playback.recentlyPlayedPlaylists.map((id) => playlists.find((playlist) => playlist.id === id)).filter((playlist): playlist is Playlist => !!playlist).slice(0, 12), [playback.recentlyPlayedPlaylists, playlists]);
  function openTrack(track: Track) { if (playback.track?.id !== track.id || !playback.loaded) playback.selectTrack(track); else if (!playback.playing) { playback.recordSelection(track.id); playback.toggle(); } router.push('/now-playing'); }
  function artistLabel(track: Track) {
    const duration = playback.track?.id === track.id && playback.duration > 0 ? playback.duration : (track.durationMs ?? 0) / 1000;
    const timestamp = Number.isFinite(duration) && duration > 0 ? formatTime(duration) : '--:--';
    return <View style={styles.artistRow}><Text numberOfLines={1} style={[styles.artist, styles.artistName]}>{track.artist}</Text><Text style={[styles.artist, styles.duration]}> • {timestamp}</Text></View>;
  }
  function quickPickRow(track: Track) {
    return <SongRow key={track.id} compact track={track} collection={picks} onOptions={() => setSong(track)} />;
  }
  function songCard(track: Track, size: number) {
    return <View key={track.id} style={{ width: size }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} onPress={() => openTrack(track)}><Artwork uri={track.artworkUri} square size={size} playing={playback.track?.id === track.id && playback.playing} /></Pressable>
      <View style={styles.cardMetadata}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} onPress={() => openTrack(track)} style={styles.trackText}><Text numberOfLines={1} style={[styles.title, playback.track?.id === track.id && styles.activeTitle]}>{track.title}</Text>{artistLabel(track)}</Pressable><IconButton icon="ellipsis-vertical" textAligned label={`Options for ${track.title}`} onPress={() => setSong(track)} /></View>
    </View>;
  }
  function playlistCard(playlist: Playlist) {
    const songs = tracks.filter((track) => playlist.trackIds.includes(track.id));
    const duration = songs.reduce((total, track) => total + (Number.isFinite(track.durationMs) && (track.durationMs ?? 0) > 0 ? track.durationMs! : 0), 0) / 1000;
    const timestamp = duration > 0 || !songs.length ? formatTime(duration) : '--:--';
    return <Pressable key={playlist.id} accessibilityRole="button" accessibilityLabel={`Open playlist ${playlist.name}`} onPress={() => router.push({ pathname: '/collection', params: { kind: 'playlist', id: playlist.id } })} style={{ width: cardSize }}>
      <PlaylistArtwork playlist={playlist} size={cardSize} />
      <View style={styles.cardMetadata}><View style={styles.trackText}><Text numberOfLines={1} style={styles.title}>{playlist.name}</Text><View style={styles.artistRow}><Text numberOfLines={1} style={[styles.artist, styles.artistName]}>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</Text><Text style={[styles.artist, styles.duration]}> • {timestamp}</Text></View></View></View>
    </Pressable>;
  }
  function section(title: string, songs: Track[], kind: 'recent', empty: string) {
    return <View style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${title}`} onPress={() => router.push({ pathname: '/collection', params: { kind } })} style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text><Ionicons name="chevron-forward" size={theme.size.icon} color={theme.colors.muted} /></Pressable>
      {songs.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>{songs.slice(0, 12).map((track) => songCard(track, cardSize))}</ScrollView> : <EmptyShelf message={empty} loading={!ready} cardSize={cardSize} />}
    </View>;
  }
  return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Quick picks</Text><Pressable accessibilityRole="button" accessibilityLabel="Play all Quick picks" accessibilityState={{ disabled: !picks.length }} disabled={!picks.length} hitSlop={theme.space.sm} onPress={() => playback.playCollection(picks, undefined, false)} style={({ pressed }) => [styles.playAll, !picks.length && styles.disabled, pressed && styles.pressed]}><Text style={styles.playAllText}>Play all</Text><Ionicons name="chevron-forward" size={theme.space.sm + theme.space.xs} color={theme.colors.text} /></Pressable></View>
      {picks.length ? picks.length <= 4 ? <View style={styles.picksPage}>{picks.map(quickPickRow)}</View> : <ScrollView horizontal pagingEnabled={Platform.OS === 'web'} snapToInterval={picksPageWidth} decelerationRate="fast" disableIntervalMomentum showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: theme.space.xl }}>{Array.from({ length: Math.ceil(picks.length / 4) }, (_, page) => <View key={page} accessibilityLabel={`Quick Picks page ${page + 1}`} style={[styles.picksPage, styles.picksCarouselPage, { width: picksPageWidth }]}>{picks.slice(page * 4, page * 4 + 4).map(quickPickRow)}</View>)}</ScrollView> : <EmptyShelf message="Songs you choose will appear here." loading={!ready} cardSize={cardSize}>
        <View style={[styles.picksPage, { width: picksPageWidth }]}>{[0, 1, 2].map((index) => <View key={index} style={styles.pickRow}>
          <View style={styles.pickDetails}><Artwork square size={theme.size.track} /><View style={[styles.trackText, styles.pickPlaceholderLines]}><View style={styles.pickPlaceholderLine} /><View style={[styles.pickPlaceholderLine, styles.pickPlaceholderShortLine]} /></View></View>
        </View>)}</View>
      </EmptyShelf>}
    </View>
    {section('Last listened to', recent, 'recent', 'Your listening history starts with your first song.')}
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Last playlists listened to</Text></View>
      {recentPlaylists.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>{recentPlaylists.map(playlistCard)}</ScrollView> : <EmptyShelf message="Play a playlist to see it here." loading={!playlistsReady || !playback.playlistHistoryReady} cardSize={cardSize} />}
    </View>
  </ScrollView><SongActions track={song} onClose={() => setSong(undefined)} /></Screen>;
}
const createStyles = (theme: Theme) => ({
  section: { marginTop: theme.space.xl },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: theme.space.md },
  sectionTitle: { ...theme.type.title, color: theme.colors.text },
  playAll: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, flexShrink: 0, gap: theme.space.xs, paddingHorizontal: theme.space.sm, paddingVertical: theme.space.xs / 2, minHeight: theme.space.xl, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.highlight },
  playAllText: { ...theme.type.caption, fontSize: theme.type.time.fontSize, lineHeight: theme.type.time.lineHeight, color: theme.colors.text },
  disabled: { opacity: theme.opacity.disabled },
  pressed: { opacity: theme.opacity.pressed },
  cards: { gap: theme.space.md, paddingBottom: theme.space.sm },
  cardMetadata: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, marginTop: theme.space.sm },
  trackText: { flex: 1, minWidth: 0 },
  title: { ...theme.type.caption, color: theme.colors.text },
  activeTitle: { color: theme.colors.accent },
  artist: { ...theme.type.caption, color: theme.colors.muted },
  artistRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  artistName: { flexShrink: 1, minWidth: 0 },
  duration: { flexShrink: 0 },
  picksPage: { gap: theme.space.md },
  picksCarouselPage: { paddingRight: theme.space.md },
  pickRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs, minHeight: theme.size.track },
  pickDetails: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  pickPlaceholderLines: { gap: theme.space.sm },
  pickPlaceholderLine: { width: '75%' as const, height: theme.space.sm, backgroundColor: theme.colors.border, borderRadius: theme.radius.pill },
  pickPlaceholderShortLine: { width: '45%' as const },
});
