import { router, useFocusEffect } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLyrics } from '../hooks/useLyrics';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { ArtworkVisualizer } from './ArtworkVisualizer';
import { MarqueeText } from './MarqueeText';
import { LyricSnippet } from './LyricSnippet';
import { LyricsOverlay } from './LyricsOverlay';
import { IconButton, RoundButton } from './Matte';
import { SongActions } from './SongActions';
import { Screen } from './Screen';
import { SeekBar } from './SeekBar';

export function Player() {
  const playback = usePlayback();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { height } = useWindowDimensions();
  const reveal = useSharedValue(0);
  const goBack = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace('/library'); }, []);
  const close = useCallback(() => { reveal.set(withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }, (finished) => { if (finished) scheduleOnRN(goBack); })); }, [goBack, reveal]);
  useFocusEffect(useCallback(() => {
    reveal.set(0);
    reveal.set(withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => { subscription.remove(); cancelAnimation(reveal); };
  }, [close, reveal]));
  const transition = useAnimatedStyle(() => ({ opacity: reveal.value, transform: [{ translateY: (1 - reveal.value) * height }] }));
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(theme.layout.contentInset, insets.bottom);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [stageHeight, setStageHeight] = useState(0);
  const [artworkSpace, setArtworkSpace] = useState(0);
  const narrow = contentSize.width < theme.size.panelWidth;
  const gap = Math.min(theme.space.xl, contentSize.height * 0.025);
  const lyricHeight = Math.min(theme.dock.lyricHeight, stageHeight * 0.34);
  const [options, setOptions] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const closeLyrics = useCallback(() => setLyricsOpen(false), []);
  const blurTarget = useRef<View>(null);
  const { lyrics, failed, retry } = useLyrics(playback.track, playback.duration);
  const haloSize = Math.min(theme.space.section, artworkSpace / 6);
  const artworkSize = Math.min(theme.size.artwork, Math.max(0, artworkSpace - haloSize * 2));
  return <Screen>
    <Animated.View style={[styles.player, transition]}><BlurTargetView ref={blurTarget} style={styles.player} aria-hidden={lyricsOpen} importantForAccessibility={lyricsOpen ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={lyricsOpen}>
    <View style={[styles.content, { paddingBottom: bottomInset }]} onLayout={({ nativeEvent }) => setContentSize(nativeEvent.layout)}>
      <View style={styles.header}>
        <RoundButton icon="chevron-down" label="Close now playing" onPress={close} />
        <View style={styles.details}>
          <MarqueeText key={playback.track?.id} style={styles.title}>{playback.track?.title ?? 'Nothing playing'}</MarqueeText>
          <MarqueeText key={`${playback.track?.id}:artist`} style={styles.artist}>{playback.track ? playback.buffering ? 'Buffering…' : playback.track.artist : 'Choose a song from your library'}</MarqueeText>
        </View>
        <RoundButton icon="ellipsis-vertical" label="Song options" selected={options} disabled={!playback.track} onPress={() => setOptions(true)} />
      </View>
      <View style={styles.stage} onLayout={({ nativeEvent }) => setStageHeight(nativeEvent.layout.height)}>
        <View style={styles.artwork} onLayout={({ nativeEvent }) => setArtworkSpace(Math.min(nativeEvent.layout.width, nativeEvent.layout.height))}>
          {artworkSpace > 0 && <ArtworkVisualizer key={playback.track?.id} size={artworkSize} haloSize={haloSize} />}
        </View>
        {playback.track ? <LyricSnippet key={playback.track.id} lyrics={lyrics} time={playback.currentTime} failed={failed} height={lyricHeight} onExpand={() => setLyricsOpen(true)} /> : <View style={[styles.emptyLyrics, { height: lyricHeight }]}><Text numberOfLines={1} style={styles.emptyTitle}>Your next favorite awaits</Text>{lyricHeight >= theme.space.section && <Text numberOfLines={lyricHeight < theme.space.section * 2 ? 1 : 2} style={styles.emptyHint}>Choose a song from Search or your library to start listening.</Text>}</View>}
      </View>
      <View style={[styles.transport, { paddingTop: gap }]}>
      <SeekBar />
      <View style={[styles.controls, { marginTop: gap }]}>
        <IconButton icon="shuffle" label={playback.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} active={playback.shuffle} selected={playback.shuffle} disabled={!playback.track} onPress={playback.toggleShuffle} />
        <RoundButton icon="play-skip-back" label="Previous track" size={narrow ? 'track' : 'small'} disabled={!playback.hasPrevious} onPress={playback.previous} />
        <RoundButton icon={playback.playing ? 'pause' : 'play'} label={playback.playing ? 'Pause' : 'Play'} size="regular" filled active disabled={!playback.loaded} onPress={playback.toggle} />
        <RoundButton icon="play-skip-forward" label="Next track" size={narrow ? 'track' : 'small'} disabled={!playback.hasNext} onPress={playback.next} />
        <View><IconButton icon="repeat" label={playback.repeat === 'off' ? 'Repeat off. Enable repeat all' : playback.repeat === 'all' ? 'Repeat all. Enable repeat one' : 'Repeat one. Turn repeat off'} active={playback.repeat !== 'off'} selected={playback.repeat !== 'off'} disabled={!playback.track} onPress={playback.cycleRepeat} />{playback.repeat === 'one' && <Text pointerEvents="none" style={styles.repeatOne}>1</Text>}</View>
      </View>
      {playback.error && <Text numberOfLines={2} accessibilityRole="alert" style={styles.error}>{playback.error}</Text>}
      </View>
    </View></BlurTargetView></Animated.View>
    {lyricsOpen && <LyricsOverlay lyrics={lyrics} failed={failed} onClose={closeLyrics} blurTarget={blurTarget} />}
    <SongActions track={options ? playback.track : undefined} onRetryLyrics={retry} onClose={() => setOptions(false)} />
  </Screen>;
}

const createStyles = (theme: Theme) => ({
  player: { flex: 1 },
  content: { flex: 1, minHeight: 0, width: '100%' as const, maxWidth: theme.size.panelWidth, alignSelf: 'center' as const },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, flexShrink: 0 },
  details: { flex: 1, minWidth: 0 },
  stage: { flex: 1, minHeight: 0 },
  artwork: { flex: 1, minHeight: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
  title: { ...theme.type.title, color: theme.colors.text },
  artist: { ...theme.type.caption, color: theme.colors.muted, marginTop: theme.space.xs },
  transport: { flexShrink: 0 },
  emptyLyrics: { flexShrink: 0, justifyContent: 'center' as const, gap: theme.space.sm },
  emptyTitle: { ...theme.type.body, color: theme.colors.text, textAlign: 'center' as const },
  emptyHint: { ...theme.type.caption, color: theme.colors.muted, textAlign: 'center' as const },
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: theme.space.xs },
  repeatOne: { ...theme.type.time, position: 'absolute' as const, right: theme.space.xs, top: 0, color: theme.colors.accent },
  error: { ...theme.type.caption, color: theme.colors.error, marginTop: theme.space.lg, textAlign: 'center' as const },
});
