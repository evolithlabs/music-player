import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { PageHeader } from '../../components/PageHeader';
import { Artwork } from '../../components/Artwork';
import { RoundButton } from '../../components/Matte';
import { useScreenBottomInset } from '../../hooks/useScreenBottomInset';
import { usePlayback } from '../../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../../state/ThemeProvider';
import { Theme, themes } from '../../theme';
import { formatTime } from '../../utils/playback';

export default function AppearanceScreen() {
  const { theme, selectTheme, error } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const playback = usePlayback();
  const carousel = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(() => Math.max(0, themes.findIndex((option) => option.id === theme.id)));
  useLayoutEffect(() => {
    if (pageWidth > 0) carousel.current?.scrollTo({ x: Math.max(0, themes.findIndex((option) => option.id === theme.id)) * pageWidth, animated: false });
  }, [pageWidth, theme.id]);
  function slide(next: number) {
    setPage(next);
    carousel.current?.scrollTo({ x: next * pageWidth, animated: true });
  }
  return <Screen>
    <PageHeader title="Appearance" />
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={[styles.content, { paddingBottom: bottomInset }]}>
      <View style={styles.carousel} onLayout={({ nativeEvent }) => setPageWidth(nativeEvent.layout.width)}>
        <ScrollView ref={carousel} style={styles.carousel} contentContainerStyle={styles.pages} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={({ nativeEvent }) => { if (pageWidth > 0) setPage(Math.max(0, Math.min(themes.length - 1, Math.round(nativeEvent.contentOffset.x / pageWidth)))); }}>
          {themes.map((option) => {
            const selected = option.id === theme.id;
            return <View key={option.id} style={[styles.page, { width: pageWidth }]}>
              <Pressable accessibilityRole="radio" accessibilityLabel={option.name} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={() => selectTheme(option.id)} style={({ pressed }) => [styles.option, { backgroundColor: option.colors.background, borderColor: selected ? option.colors.accent : option.colors.border }, pressed && styles.pressed]}>
                <ExpandedPlayerPreview theme={option} playback={playback} />
                <View style={[styles.optionDetails, { borderColor: option.colors.border }]}><View style={styles.optionHeading}><View style={styles.themeName}><Text style={[styles.title, { color: option.colors.text }]}>{option.name}</Text>{selected && <Ionicons name="checkmark" size={option.size.smallIcon} color={option.colors.accent} />}</View><View style={styles.palette}>{[option.colors.background, option.colors.surface, option.colors.text, option.colors.accent].map((color) => <View key={color} style={[styles.swatch, { backgroundColor: color, borderColor: option.colors.border }]} />)}</View></View><Text style={[styles.caption, { color: option.colors.muted }]}>{option.description}</Text></View>
              </Pressable>
            </View>;
          })}
        </ScrollView>
      </View>
      <View style={styles.navigation}><RoundButton icon="chevron-back" label="Previous theme" disabled={page <= 0 || !pageWidth} onPress={() => slide(page - 1)} /><Text accessibilityLiveRegion="polite" style={styles.caption}>{page + 1} / {themes.length}</Text><RoundButton icon="chevron-forward" label="Next theme" disabled={page >= themes.length - 1 || !pageWidth} onPress={() => slide(page + 1)} /></View>
    </View>
  </Screen>;
}

const createStyles = (theme: Theme) => ({
  content: { flex: 1, minHeight: 0 },
  carousel: { flex: 1, minHeight: 0 },
  pages: { alignItems: 'stretch' as const },
  page: { height: '100%' as const },
  option: { flex: 1, width: '100%' as const, maxWidth: theme.dock.maxWidth, alignSelf: 'center' as const, borderRadius: theme.radius.card, borderWidth: theme.size.border, overflow: 'hidden' as const },
  optionDetails: { flexShrink: 0, gap: theme.space.xs, padding: theme.space.md, borderTopWidth: theme.size.border },
  optionHeading: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: theme.space.sm },
  themeName: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm },
  title: { ...theme.type.title, flexShrink: 1 },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  palette: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm },
  swatch: { width: theme.size.icon, height: theme.size.icon, borderRadius: theme.radius.pill, borderWidth: theme.size.border },
  navigation: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.space.lg, marginTop: theme.space.md },
  error: { ...theme.type.body, color: theme.colors.error, marginBottom: theme.space.md },
  pressed: { opacity: theme.opacity.pressed },
});

function ExpandedPlayerPreview({ theme, playback }: { theme: Theme; playback: ReturnType<typeof usePlayback> }) {
  const styles = useMemo(() => StyleSheet.create(createPreviewStyles(theme)), [theme]);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const artworkSize = Math.max(0, Math.min(theme.size.artwork, stage.width, stage.height - theme.space.md)) * 0.94;
  const duration = playback.duration || (playback.track?.durationMs ?? 0) / 1000;
  const progress = duration > 0 ? Math.min(1, playback.currentTime / duration) : 0;
  return <LinearGradient colors={theme.gradients.canvas} style={styles.preview} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={styles.header}><Ionicons name="chevron-down" style={styles.headerIcon} size={theme.size.smallIcon} color={theme.colors.text} /><View style={styles.details}><Text numberOfLines={1} style={styles.title}>{playback.track?.title ?? 'Your next favorite'}</Text><Text numberOfLines={1} style={styles.artist}>{playback.track?.artist ?? 'Choose a song from your library'}</Text></View><Ionicons name="ellipsis-vertical" style={styles.headerIcon} size={theme.size.smallIcon} color={theme.colors.text} /></View>
    <View style={styles.stage} onLayout={({ nativeEvent }) => setStage(nativeEvent.layout)}>
      {artworkSize > 0 && <Artwork uri={playback.track?.artworkUri} size={artworkSize} square previewTheme={theme} />}
    </View>
    <View style={styles.transport}>
      <View style={styles.times}><Text style={styles.time}>{formatTime(playback.currentTime)}</Text><Text style={styles.time}>{formatTime(duration)}</Text></View>
      <View style={styles.seek}><View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View><View style={[styles.thumb, { left: `${Math.max(0.025, Math.min(0.975, progress)) * 100}%` }]} /></View>
      <View style={styles.controls}><Ionicons name="shuffle" size={theme.size.smallIcon} color={playback.shuffle ? theme.colors.accent : theme.colors.text} /><Ionicons name="play-skip-back" size={theme.size.smallIcon} color={theme.colors.text} /><View style={styles.play}><Ionicons name={playback.playing ? 'pause' : 'play'} size={theme.size.icon} color={theme.colors.onAccent} /></View><Ionicons name="play-skip-forward" size={theme.size.smallIcon} color={theme.colors.text} /><Ionicons name="repeat" size={theme.size.smallIcon} color={playback.repeat === 'off' ? theme.colors.text : theme.colors.accent} /></View>
    </View>
  </LinearGradient>;
}

const createPreviewStyles = (theme: Theme) => ({
  preview: { flex: 1, minHeight: 0, paddingHorizontal: theme.layout.contentInset, paddingTop: theme.space.md },
  header: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: theme.space.md, minHeight: theme.size.smallControl, flexShrink: 0 },
  headerIcon: { marginTop: theme.space.xs },
  details: { flex: 1, minWidth: 0 },
  title: { ...theme.type.title, color: theme.colors.text, textAlign: 'center' as const },
  artist: { ...theme.type.caption, color: theme.colors.muted, textAlign: 'center' as const },
  stage: { flex: 1, minHeight: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
  transport: { flexShrink: 0, paddingBottom: theme.space.xl },
  times: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  time: { ...theme.type.time, color: theme.colors.muted },
  seek: { height: theme.space.lg, justifyContent: 'center' as const },
  track: { height: theme.size.progress / 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, overflow: 'hidden' as const },
  fill: { height: '100%' as const, backgroundColor: theme.colors.accent },
  thumb: { position: 'absolute' as const, width: theme.space.md, height: theme.space.md, marginLeft: -theme.space.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginTop: theme.space.xl },
  play: { width: theme.size.control, height: theme.size.control, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, alignItems: 'center' as const, justifyContent: 'center' as const },
});
