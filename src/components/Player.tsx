import { router, useFocusEffect } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, GestureResponderEvent, PanResponder, PanResponderGestureState, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, Extrapolation, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLyrics } from '../hooks/useLyrics';
import { useDelayedValue } from '../hooks/useDelayedValue';
import { catalogIdentity } from '../utils/catalog';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Track } from '../types/music';
import { SongRow } from './SongRow';
import { MarqueeText } from './MarqueeText';
import { LyricSnippet } from './LyricSnippet';
import { LyricsOverlay } from './LyricsOverlay';
import { IconButton, RoundButton } from './Matte';
import { SongActions } from './SongActions';
import { Screen } from './Screen';
import { SeekBar } from './SeekBar';
import { Artwork } from './Artwork';
import { ArtistLink } from './ArtistLink';

export function Player() {
  const playback = usePlayback();
  const pending = playback.preparing?.catalog ?? playback.playError?.catalog;
  const artworkUri = pending?.coverUrl ?? playback.track?.artworkUri;
  const title = pending?.title ?? playback.track?.title ?? 'Nothing playing';
  const artist = pending?.artist ?? playback.track?.artist;
  const busy = !!playback.preparing || !!playback.track && !playback.loaded && !playback.playError;
  const loading = useDelayedValue(busy ? pending ? catalogIdentity(pending) : playback.track?.id : undefined);
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
  const scroll = useAnimatedRef<ScrollView>();
  const queueScroll = useRef<ScrollView>(null);
  const queueScrollOffset = useSharedValue(0);
  const queueProgress = useSharedValue(0);
  const switchingQueue = useSharedValue(false);
  const queueTarget = useSharedValue(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [artworkFrame, setArtworkFrame] = useState({ y: 0, height: 0 });
  const [headerHeight, setHeaderHeight] = useState(theme.size.smallControl + theme.layout.contentInset);
  const [transportHeight, setTransportHeight] = useState(theme.size.control + theme.space.section * 2);
  const [waveformTop, setWaveformTop] = useState(0);
  const stageHeight = Math.max(0, contentSize.height - headerHeight - transportHeight - bottomInset);
  const coverHeight = Math.max(0, Math.min(contentSize.height - bottomInset, Math.max(headerHeight + transportHeight + theme.space.section, contentSize.height * 0.64 - 100)));
  const queueHeight = Math.max(0, contentSize.height - coverHeight);
  const queueOffset = Math.max(0, queueHeight - bottomInset);
  useFocusEffect(useCallback(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    queueScroll.current?.scrollTo({ y: 0, animated: false });
    cancelAnimation(queueProgress);
    queueProgress.set(0); switchingQueue.set(false); queueTarget.set(false); queueScrollOffset.set(0);
    setQueueOpen(false);
    return () => cancelAnimation(queueProgress);
  }, [queueProgress, queueScrollOffset, queueTarget, scroll, switchingQueue]));
  const [artworkSpace, setArtworkSpace] = useState(0);
  const narrow = contentSize.width < theme.size.panelWidth;
  const gap = Math.min(theme.space.xl, contentSize.height * 0.025);
  const lyricHeight = Math.min(theme.dock.lyricHeight, theme.space.section * 2, stageHeight * 0.24);
  const [options, setOptions] = useState(false);
  const [queueSong, setQueueSong] = useState<Track>();
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const closeLyrics = useCallback(() => setLyricsOpen(false), []);
  const blurTarget = useRef<View>(null);
  const { lyrics, failed, retry } = useLyrics(playback.track, playback.duration);
  const artworkInset = Math.min(theme.space.xl, artworkSpace / 10);
  const artworkSize = Math.min(theme.size.artwork + theme.space.section, Math.max(0, artworkSpace - artworkInset * 2)) * 0.94;
  const artworkLift = Math.min(theme.space.md, Math.max(0, (artworkFrame.height - artworkSize) / 2));
  const artworkBottom = artworkFrame.y + (artworkFrame.height + artworkSize) / 2 - artworkLift;
  const timelineTop = stageHeight + gap + waveformTop;
  const lyricOffset = (artworkBottom + timelineTop - lyricHeight) / 2 - (stageHeight - lyricHeight);
  const showQueue = useCallback((open: boolean) => {
    setQueueOpen(open);
    queueTarget.set(open); switchingQueue.set(true);
    queueProgress.set(withTiming(open ? 1 : 0, { duration: 480, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) switchingQueue.set(false);
    }));
  }, [queueProgress, queueTarget, switchingQueue]);
  const returnToPlayer = () => showQueue(false);
  // One clock moves the scroll position and artwork together; a gesture chooses
  // an endpoint instead of leaving the player partly expanded.
  useAnimatedReaction(() => queueProgress.value * queueOffset, (y) => { scrollTo(scroll, 0, y, false); });
  const onScroll = useAnimatedScrollHandler((event) => {
    if (queueOffset <= 0) return;
    const y = Math.max(0, event.contentOffset.y);
    if (switchingQueue.value) {
      const position = queueProgress.value * queueOffset;
      if (Math.abs(y - position) > 1) scrollTo(scroll, 0, position, false);
      return;
    }
    if ((!queueTarget.value && y > 2) || (queueTarget.value && y < queueOffset - 2)) {
      switchingQueue.set(true);
      scrollTo(scroll, 0, queueProgress.value * queueOffset, false);
      scheduleOnRN(showQueue, !queueTarget.value);
    }
  });
  const shouldReturnToPlayer = useCallback((_: GestureResponderEvent, gesture: PanResponderGestureState) => queueTarget.get() && queueScrollOffset.get() <= 1 && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx), [queueScrollOffset, queueTarget]);
  const queueGesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: shouldReturnToPlayer,
    onPanResponderGrant: () => showQueue(false),
  }), [shouldReturnToPlayer, showQueue]);
  const expandedArtwork = useAnimatedStyle(() => {
    const progress = queueProgress.value;
    const x = (contentSize.width - artworkSize) / 2;
    const y = headerHeight + artworkFrame.y + (artworkFrame.height - artworkSize) / 2 - artworkLift;
    return {
      opacity: 1,
      left: x * (1 - progress), top: (y - queueOffset * progress) * (1 - progress),
      width: artworkSize + (contentSize.width - artworkSize) * progress,
      height: artworkSize + (coverHeight - artworkSize) * progress,
      borderRadius: theme.radius.card / 2 * (1 - progress),
    };
  });
  const artworkDim = useAnimatedStyle(() => ({ opacity: queueProgress.value }));
  const normalArtwork = useAnimatedStyle(() => ({ opacity: interpolate(queueProgress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: -artworkLift }] }));
  const lyricFade = useAnimatedStyle(() => ({ opacity: interpolate(queueProgress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: lyricOffset * (1 - queueProgress.value) }] }));
  const queueLinkFade = useAnimatedStyle(() => ({ opacity: 1 - queueProgress.value }));
  const collapseIcon = useAnimatedStyle(() => ({ transform: [{ rotate: `${queueProgress.value * 180}deg` }] }));
  return <Animated.View style={[styles.player, transition]}><Screen>
    <BlurTargetView ref={blurTarget} style={styles.player} aria-hidden={lyricsOpen} importantForAccessibility={lyricsOpen ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={lyricsOpen}>
    <View style={styles.viewport} onLayout={({ nativeEvent }) => setContentSize(nativeEvent.layout)}>
    {artworkUri && <Animated.View pointerEvents="none" style={[styles.expandedArtwork, expandedArtwork]}><Animated.Image accessible={false} source={{ uri: artworkUri }} resizeMode="cover" style={styles.cover} /></Animated.View>}
      <View style={styles.header} onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <Animated.View pointerEvents="none" style={[styles.gradientFill, styles.headerGradient, artworkDim]}><LinearGradient colors={[`${theme.colors.recessed}F5`, `${theme.colors.recessed}C7`, `${theme.colors.recessed}00`]} locations={[0, 0.45, 1]} style={styles.cover} /></Animated.View>
        <RoundButton icon="chevron-down" iconStyle={[styles.headerIcon, collapseIcon]} label={queueOpen ? 'Return to song' : 'Close now playing'} onPress={() => { if (queueTarget.get()) showQueue(false); else close(); }} />
        <View style={styles.details}>
          <MarqueeText key={title} style={styles.title}>{title}</MarqueeText>
          <View style={styles.artistLink}>{artist ? <ArtistLink artist={artist} trackId={pending?.deezerId ?? playback.track?.deezerId} style={styles.artist} /> : <Text style={styles.artist}>Choose a song from your library</Text>}</View>
        </View>
        <RoundButton icon="ellipsis-vertical" iconStyle={styles.headerIcon} label="Song options" selected={options} disabled={!playback.track} onPress={() => setOptions(true)} />
      </View>
    <Animated.ScrollView ref={scroll} style={styles.player} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} bounces={false} nestedScrollEnabled>
      <View style={[styles.stage, { height: stageHeight }]}>
        <Animated.View style={[styles.artwork, normalArtwork]} onLayout={({ nativeEvent }) => { setArtworkSpace(Math.min(nativeEvent.layout.width, nativeEvent.layout.height)); setArtworkFrame({ y: nativeEvent.layout.y, height: nativeEvent.layout.height }); }}>
          {artworkSpace > 0 && !artworkUri && <Artwork size={artworkSize} square />}
        </Animated.View>
        <Animated.View pointerEvents={queueOpen ? 'none' : 'auto'} aria-hidden={queueOpen} accessibilityElementsHidden={queueOpen} importantForAccessibility={queueOpen ? 'no-hide-descendants' : 'auto'} style={lyricFade}>
        {playback.track ? <LyricSnippet key={playback.track.id} lyrics={lyrics} time={playback.currentTime} failed={failed} height={lyricHeight} onExpand={() => setLyricsOpen(true)} /> : <View style={[styles.emptyLyrics, { height: lyricHeight }]}><Text numberOfLines={1} style={styles.emptyTitle}>{pending ? busy ? 'Preparing your song…' : 'Try playing this song again' : 'Your next favorite awaits'}</Text>{!pending && lyricHeight >= theme.space.section && <Text numberOfLines={lyricHeight < theme.space.section * 2 ? 1 : 2} style={styles.emptyHint}>Choose a song from Search or your library to start listening.</Text>}</View>}
        </Animated.View>
      </View>
      <Animated.View style={[styles.transport, { paddingTop: gap }]} onLayout={({ nativeEvent }) => setTransportHeight(nativeEvent.layout.height)}>
      <Animated.View pointerEvents="none" style={[styles.gradientFill, artworkDim]}><LinearGradient colors={[`${theme.colors.background}00`, `${theme.colors.background}D9`, theme.colors.background]} locations={[0, 0.45, 1]} style={styles.cover} /></Animated.View>
      <SeekBar waveform onWaveformTopChange={setWaveformTop} />
      <View style={[styles.controls, { marginTop: gap }]}>
        <IconButton icon="shuffle" label={playback.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} active={playback.shuffle} selected={playback.shuffle} disabled={!playback.track} onPress={playback.toggleShuffle} />
        <RoundButton icon="play-skip-back" label="Previous track" size={narrow ? 'track' : 'small'} disabled={!playback.hasPrevious} onPress={playback.previous} />
        <View style={styles.playSlot}>{busy ? <View accessibilityRole="progressbar" accessibilityLabel={`Preparing ${title}`} style={styles.loadingControl}>{loading && <ActivityIndicator color={theme.colors.onAccent} />}</View> : <RoundButton icon={playback.playing ? 'pause' : 'play'} label={playback.playing ? 'Pause' : 'Play'} size="regular" filled active disabled={!playback.loaded && !playback.playError?.catalog} onPress={() => { if (playback.playError?.catalog && playback.playError.serviceUrl) void playback.playCatalog(playback.playError.serviceUrl, playback.playError.catalog).catch(() => {}); else playback.toggle(); }} />}</View>
        <RoundButton icon="play-skip-forward" label="Next track" size={narrow ? 'track' : 'small'} disabled={!playback.hasNext} onPress={playback.next} />
        <View><IconButton icon="repeat" label={playback.repeat === 'off' ? 'Repeat off. Enable repeat all' : playback.repeat === 'all' ? 'Repeat all. Enable repeat one' : 'Repeat one. Turn repeat off'} active={playback.repeat !== 'off'} selected={playback.repeat !== 'off'} disabled={!playback.track} onPress={playback.cycleRepeat} />{playback.repeat === 'one' && <Text pointerEvents="none" style={styles.repeatOne}>1</Text>}</View>
      </View>
      {playback.error && <Text numberOfLines={2} accessibilityRole="alert" style={styles.error}>{playback.error}</Text>}
      <View style={styles.queueToggle}>
        <Animated.View pointerEvents="none" style={[styles.separator, artworkDim]} />
        <Animated.View pointerEvents={queueOpen ? 'none' : 'auto'} aria-hidden={queueOpen} importantForAccessibility={queueOpen ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={queueOpen} style={queueLinkFade}>
          <Pressable accessibilityRole="button" accessibilityLabel="Show upcoming songs" accessibilityHint="Open the playback queue" onPress={() => showQueue(true)} style={styles.upNext}><View style={styles.queueHandle} /><Text style={styles.queueLink}>Up next</Text></Pressable>
        </Animated.View>
      </View>
      </Animated.View>
    <Animated.View {...queueGesture.panHandlers} pointerEvents={queueOpen ? 'auto' : 'none'} aria-hidden={!queueOpen} importantForAccessibility={queueOpen ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!queueOpen} style={[{ height: queueHeight }, artworkDim]}>
    <ScrollView ref={queueScroll} nestedScrollEnabled bounces={false} showsVerticalScrollIndicator={false} onScroll={({ nativeEvent }) => { queueScrollOffset.set(Math.max(0, nativeEvent.contentOffset.y)); }} scrollEventThrottle={16} contentContainerStyle={[styles.queue, { paddingBottom: bottomInset + theme.space.xl }]}>
      <View style={styles.queueHeader}><Text style={styles.queueHeading}>Up next</Text></View>
      {playback.shuffle && <Text style={styles.queueHint}>Shuffle is on. The next song is chosen from this list.</Text>}
      {playback.repeat === 'one' && <Text style={styles.queueHint}>The current song repeats until repeat one is turned off.</Text>}
      {playback.upcoming.length ? playback.upcoming.map((track) => {
        return <SongRow key={track.id} track={track} onPlay={() => { if (playback.track?.id !== track.id) playback.playQueuedTrack(track); else if (!playback.playing) playback.toggle(); returnToPlayer(); }} onOptions={() => setQueueSong(track)} />;
      }) : <Text style={styles.queueHint}>{playback.track ? 'You’ve reached the end of this queue.' : 'Choose a song or playlist to start a queue.'}</Text>}
    </ScrollView></Animated.View>
    </Animated.ScrollView></View></BlurTargetView>
    {lyricsOpen && <LyricsOverlay lyrics={lyrics} failed={failed} onClose={closeLyrics} blurTarget={blurTarget} />}
    <SongActions track={queueSong ?? (options ? playback.track : undefined)} onRetryLyrics={queueSong ? undefined : retry} onClose={() => { setOptions(false); setQueueSong(undefined); }} onRemoved={() => router.replace('/library')} />
  </Screen></Animated.View>;
}

const createStyles = (theme: Theme) => ({
  player: { flex: 1 },
  viewport: { flex: 1, overflow: 'hidden' as const, marginHorizontal: -theme.layout.contentInset, marginTop: -theme.layout.contentInset },
  expandedArtwork: { position: 'absolute' as const, overflow: 'hidden' as const },
  cover: { width: '100%' as const, height: '100%' as const },
  gradientFill: { position: 'absolute' as const, inset: 0 },
  headerGradient: { bottom: -theme.space.section * 2 },
  header: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: theme.space.md, flexShrink: 0, width: '100%' as const, maxWidth: theme.size.panelWidth + theme.layout.contentInset * 2, alignSelf: 'center' as const, paddingHorizontal: theme.layout.contentInset, paddingTop: theme.layout.contentInset },
  headerIcon: { flex: 0, minHeight: theme.size.smallIcon, marginTop: theme.space.xs },
  details: { flex: 1, minWidth: 0 },
  stage: { width: '100%' as const, maxWidth: theme.size.panelWidth, alignSelf: 'center' as const, paddingHorizontal: theme.layout.contentInset },
  artwork: { flex: 1, minHeight: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
  title: { ...theme.type.title, color: theme.colors.text },
  artistLink: { alignItems: 'center' as const },
  artist: { ...theme.type.caption, color: theme.colors.muted, marginTop: theme.space.xs },
  transport: { flexShrink: 0, width: '100%' as const, maxWidth: theme.size.panelWidth + theme.layout.contentInset * 2, alignSelf: 'center' as const, paddingHorizontal: theme.layout.contentInset },
  emptyLyrics: { flexShrink: 0, justifyContent: 'center' as const, gap: theme.space.sm },
  emptyTitle: { ...theme.type.body, color: theme.colors.text, textAlign: 'center' as const },
  emptyHint: { ...theme.type.caption, color: theme.colors.muted, textAlign: 'center' as const },
  playSlot: { width: theme.size.control, height: theme.size.control },
  loadingControl: { flex: 1, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, justifyContent: 'center' as const, alignItems: 'center' as const },
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: theme.space.xs },
  repeatOne: { ...theme.type.time, position: 'absolute' as const, right: theme.space.xs, top: 0, color: theme.colors.accent },
  error: { ...theme.type.caption, color: theme.colors.error, marginTop: theme.space.lg, textAlign: 'center' as const },
  queueToggle: { height: theme.size.smallControl + theme.space.md, paddingTop: theme.space.md, justifyContent: 'center' as const },
  separator: { position: 'absolute' as const, left: 0, right: 0, height: theme.size.border, backgroundColor: theme.colors.border },
  upNext: { alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.space.sm, minHeight: theme.size.smallControl },
  queueHandle: { width: theme.space.xxl, height: theme.space.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.muted, opacity: theme.opacity.disabled },
  queueLink: { ...theme.type.caption, color: theme.colors.muted },
  queue: { width: '100%' as const, maxWidth: theme.dock.maxWidth, alignSelf: 'center' as const, paddingHorizontal: theme.layout.contentInset, paddingBottom: theme.space.xl, backgroundColor: theme.colors.background },
  queueHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: theme.space.md },
  queueHeading: { ...theme.type.body, fontWeight: '500' as const, color: theme.colors.muted },
  queueHint: { ...theme.type.caption, color: theme.colors.muted, marginBottom: theme.space.md },
  queueRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, paddingVertical: theme.space.sm, minHeight: theme.size.track + theme.space.sm },
  queueDetails: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md },
  queueTitle: { ...theme.type.body, color: theme.colors.text },
});
