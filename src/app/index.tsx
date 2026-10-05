import { Ionicons } from '@expo/vector-icons';
import { Paths } from 'expo-file-system';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '../components/Artwork';
import { IconButton } from '../components/Matte';
import { EmptyShelf } from '../components/EmptyShelf';
import { Screen } from '../components/Screen';
import { SongActions } from '../components/SongActions';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { useLibrary } from '../state/LibraryProvider';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Track } from '../types/music';

export default function HomeScreen() {
  const { tracks, ready } = useLibrary();
  const playback = usePlayback();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= theme.size.wideBreakpoint;
  const availableWidth = width - theme.layout.contentInset * 2 - insets.left - insets.right;
  const cardSize = wide ? Math.min(theme.size.albumArtwork, (availableWidth - theme.space.md * 4) / 5) : Math.min(theme.size.albumArtwork - theme.space.xl, availableWidth * 0.34);
  const [freeSpace, setFreeSpace] = useState<number>();
  const [song, setSong] = useState<Track>();
  const picks = useMemo(() => playback.quickPicks.map((id) => tracks.find((track) => track.id === id && track.fileState !== 'missing')).filter((track): track is Track => !!track).slice(0, 12), [playback.quickPicks, tracks]);
  const recent = useMemo(() => playback.recentlyPlayed.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => !!track), [playback.recentlyPlayed, tracks]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const read = () => { try { const bytes = Paths.availableDiskSpace; setFreeSpace(Number.isFinite(bytes) && bytes >= 0 ? bytes : undefined); } catch { setFreeSpace(undefined); } };
    void Promise.resolve().then(read);
    const timer = setInterval(read, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') read(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  function openTrack(track: Track) { if (playback.track?.id !== track.id) playback.selectTrack(track); else playback.recordSelection(track.id); router.push('/now-playing'); }
  function songCard(track: Track, size: number, quickPick = false) {
    return <View key={track.id} style={{ width: size }}>
      <Pressable accessibilityRole="button" accessibilityLabel={quickPick ? `Quick pick ${track.title}` : `Open player for ${track.title}`} onPress={() => openTrack(track)}><Artwork uri={track.artworkUri} square size={size} /></Pressable>
      <View style={styles.cardMetadata}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} onPress={() => openTrack(track)} style={styles.trackText}><Text numberOfLines={1} style={styles.title}>{track.title}</Text><Text numberOfLines={1} style={styles.artist}>{track.artist}</Text></Pressable><IconButton icon="ellipsis-vertical" textAligned label={quickPick ? `Quick pick options for ${track.title}` : `Options for ${track.title}`} onPress={() => setSong(track)} /></View>
    </View>;
  }
  function section(title: string, songs: Track[], kind: 'recent', empty: string) {
    return <View style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${title}`} onPress={() => router.push({ pathname: '/collection', params: { kind } })} style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text><Ionicons name="chevron-forward" size={theme.size.icon} color={theme.colors.muted} /></Pressable>
      {songs.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>{songs.slice(0, 12).map((track) => songCard(track, cardSize))}</ScrollView> : <EmptyShelf message={empty} loading={!ready} cardSize={cardSize} />}
    </View>;
  }
  return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
    <View style={styles.header}><Text style={[styles.logo, wide && styles.wideLogo, width < theme.size.panelWidth && styles.compactLogo]}>GROOVIO</Text><View accessibilityLabel={freeSpace === undefined ? 'Device storage information is available on your phone' : `${(freeSpace / 1e9).toFixed(1)} gigabytes free`} style={styles.storage}><Ionicons name="phone-portrait-outline" size={theme.size.smallIcon} color={theme.colors.muted} /><Text style={styles.storageText}>{freeSpace === undefined ? 'Device storage' : `${(freeSpace / 1e9).toFixed(1)} GB free`}</Text><View style={styles.statusDot} /></View></View>
    <View style={styles.section}>
      {picks.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{Array.from({ length: Math.ceil(picks.length / 6) }, (_, page) => <View key={page} accessibilityLabel={`Quick Picks page ${page + 1}`} style={[styles.picksGrid, { width: Math.max(0, availableWidth) }]}>{picks.slice(page * 6, page * 6 + 6).map((track) => songCard(track, Math.max(0, (availableWidth - theme.space.md * 2) / 3), true))}</View>)}</ScrollView> : <Text style={styles.artist}>Songs you choose will appear here.</Text>}
    </View>
    {section('Recently Played', recent, 'recent', 'Your listening history starts with your first song.')}
  </ScrollView><SongActions track={song} onClose={() => setSong(undefined)} /></Screen>;
}
const createStyles = (theme: Theme) => ({
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: theme.space.sm, minHeight: theme.size.smallControl, marginVertical: theme.space.sm },
  logo: { ...theme.type.title, letterSpacing: theme.space.xs, color: theme.colors.text },
  wideLogo: { ...theme.type.heading, letterSpacing: theme.space.sm },
  compactLogo: { letterSpacing: theme.space.xs / 2 },
  storage: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + theme.space.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.recessed, borderWidth: theme.size.border, borderColor: theme.colors.highlight, boxShadow: theme.shadows.inset },
  storageText: { ...theme.type.time, color: theme.colors.text },
  statusDot: { width: theme.space.sm, height: theme.space.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  section: { marginTop: theme.space.xl },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: theme.space.md },
  sectionTitle: { ...theme.type.title, color: theme.colors.text },
  cards: { gap: theme.space.md, paddingBottom: theme.space.sm },
  cardMetadata: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, marginTop: theme.space.sm },
  trackText: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  artist: { ...theme.type.caption, color: theme.colors.muted },
  picksGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, columnGap: theme.space.md, rowGap: theme.space.md, alignContent: 'flex-start' as const },
});
