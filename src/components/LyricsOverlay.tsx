import { BlurView } from 'expo-blur';
import { KeyboardEvent, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lyrics } from '../services/lyrics';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { activeLyricIndex } from '../utils/lyrics';
import { RoundButton } from './Matte';

export function LyricsOverlay({ lyrics, failed, onClose, blurTarget }: { lyrics?: Lyrics; failed: boolean; onClose: () => void; blurTarget: RefObject<View | null> }) {
  const playback = usePlayback();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const root = useRef<View>(null);
  const lyricKey = useMemo(() => JSON.stringify([playback.track?.id, lyrics?.kind, lyrics?.lines]), [playback.track?.id, lyrics?.kind, lyrics?.lines]);
  const layout = useMemo(() => ({ key: lyricKey, rows: new Map<number, number>() }), [lyricKey]);
  const [positionedLayout, setPositionedLayout] = useState<typeof layout>();
  const initializedLayout = useRef<typeof layout>(undefined);
  const contentLayout = useRef<{ layout: typeof layout; height: number }>(undefined);
  const [viewport, setViewport] = useState(0);
  const manuallyScrolling = useRef(0);
  const index = lyrics?.kind === 'synced' ? activeLyricIndex(lyrics.lines, playback.currentTime) : -1;
  const follow = useCallback((animated = true, height = viewport) => {
    if (Date.now() < manuallyScrolling.current) return false;
    // Wait for all scroll bounds before revealing the initial lyric position.
    if (!scroll.current || height <= 0 || contentLayout.current?.layout !== layout || contentLayout.current.height <= 0 || index >= 0 && !layout.rows.has(index)) return false;
    scroll.current.scrollTo({ y: Math.max(0, (layout.rows.get(index) ?? 0) - height * 0.35), animated: animated && initializedLayout.current === layout });
    initializedLayout.current = layout;
    return true;
  }, [index, viewport, layout]);
  useLayoutEffect(() => { manuallyScrolling.current = 0; }, [playback.track?.id]);
  useLayoutEffect(() => { follow(); }, [follow]);
  useEffect(() => {
    root.current?.focus();
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => subscription.remove();
  }, [onClose]);
  const message = failed ? 'Lyrics couldn’t load. Retry from song options.' : !lyrics ? 'Finding lyrics…' : lyrics.kind === 'instrumental' ? 'Instrumental' : 'No lyrics found for this song.';
  return <Animated.View ref={root} focusable entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={styles.root} role="dialog" aria-label="Full lyrics" aria-modal accessibilityViewIsModal
    {...(Platform.OS === 'web' ? { onKeyDown: (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); } } : {})}>
    <BlurView blurTarget={blurTarget} blurMethod="dimezisBlurView" intensity={85} tint="dark" style={styles.blur} />
    <View style={[styles.content, { paddingTop: Math.max(theme.space.lg, insets.top), paddingBottom: Math.max(theme.space.lg, insets.bottom) }]}>
      <View style={styles.header}><View style={styles.details}><Text numberOfLines={1} style={styles.title}>{playback.track?.title}</Text><Text style={styles.artist}>{playback.track?.artist}</Text></View><RoundButton icon="chevron-down" label="Close lyrics" onPress={onClose} /></View>
      <ScrollView key={layout.key} ref={scroll} style={lyrics?.kind === 'synced' && positionedLayout !== layout ? styles.positioning : undefined} showsVerticalScrollIndicator={false} onLayout={({ nativeEvent }) => { const height = nativeEvent.layout.height; setViewport(height); if (follow(false, height)) setPositionedLayout(layout); }} onContentSizeChange={(_, height) => { contentLayout.current = { layout, height }; if (follow(false)) setPositionedLayout(layout); }} onScrollBeginDrag={() => { manuallyScrolling.current = Date.now() + 5000; }} contentContainerStyle={[styles.lines, { paddingBottom: viewport * 0.5 }]}>
        {lyrics?.kind === 'synced' ? lyrics.lines.map((line, row) => <Pressable key={`${row}:${line.time}`} accessibilityRole="button" accessibilityLabel={`Seek to lyric: ${line.text || 'Instrumental'}`} onPress={() => { manuallyScrolling.current = 0; void playback.seek(line.time); }} onLayout={({ nativeEvent }) => { layout.rows.set(row, nativeEvent.layout.y); if (row === index && follow(false)) setPositionedLayout(layout); }} style={styles.line}><Text style={[styles.lyric, row === index ? styles.active : styles.inactive]}>{line.text || '♪'}</Text></Pressable>) : lyrics?.plainText ? <Text style={styles.lyric}>{lyrics.plainText}</Text> : <Text style={styles.artist}>{message}</Text>}
      </ScrollView>
      <View style={[styles.footer, { bottom: Math.max(theme.space.lg, insets.bottom) }]}>
        <RoundButton icon="play-skip-back" label="Previous track" filled disabled={!playback.hasPrevious} onPress={playback.previous} />
        <RoundButton icon="play-skip-forward" label="Next track" filled disabled={!playback.hasNext} onPress={playback.next} />
        <RoundButton icon={playback.playing ? 'pause' : 'play'} label={playback.playing ? 'Pause' : 'Play'} filled active disabled={!playback.loaded} onPress={playback.toggle} />
      </View>
    </View>
  </Animated.View>;
}

const createStyles = (theme: Theme) => ({
  root: { position: 'absolute' as const, inset: 0, zIndex: 10 },
  blur: { position: 'absolute' as const, inset: 0 },
  content: { flex: 1, paddingHorizontal: theme.layout.contentInset, backgroundColor: theme.colors.transparent },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, paddingBottom: theme.space.xl },
  details: { flex: 1 },
  title: { ...theme.type.title, color: theme.colors.text },
  artist: { ...theme.type.caption, color: theme.colors.muted },
  lines: { paddingTop: theme.space.xxl },
  positioning: { opacity: 0 },
  line: { paddingVertical: theme.space.sm },
  lyric: { ...theme.type.title, lineHeight: theme.size.icon + theme.space.sm, color: theme.colors.text },
  active: { opacity: 1 },
  inactive: { opacity: theme.opacity.disabled },
  footer: { position: 'absolute' as const, right: theme.layout.contentInset, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, padding: theme.space.sm, borderRadius: theme.radius.pill, overflow: 'hidden' as const },
});
