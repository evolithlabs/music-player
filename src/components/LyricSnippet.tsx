import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useLayoutEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Lyrics } from '../services/lyrics';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { activeLyricIndex } from '../utils/lyrics';

export function LyricSnippet({ lyrics, time, failed, compact = false, height, onExpand }: { lyrics?: Lyrics; time: number; failed: boolean; compact?: boolean; height?: number; onExpand?: () => void }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const windowHeight = height ?? theme.dock.lyricHeight;
  const sectionStyle = [styles.section, compact && styles.compact, height !== undefined && { height, minHeight: 0, marginVertical: 0, flexShrink: 0 }];
  const index = lyrics?.kind === 'synced' ? activeLyricIndex(lyrics.lines, time) : -1;
  const rowHeight = theme.space.lg + theme.space.md;
  const centerOffset = (windowHeight - rowHeight) / 2;
  const target = centerOffset - (index + 2) * rowHeight;
  const offset = useSharedValue(target);
  const latestTarget = useRef(target);
  const previous = useRef<{ lines?: Lyrics['lines']; rowHeight: number; centerOffset: number }>(undefined);
  useLayoutEffect(() => {
    latestTarget.current = target;
    // Loading lyrics and laying out the player should place the line immediately.
    // Only subsequent playback changes slide between lines.
    const animate = previous.current?.lines === lyrics?.lines && previous.current?.rowHeight === rowHeight && previous.current?.centerOffset === centerOffset;
    offset.value = animate ? withTiming(target, { duration: 650, easing: Easing.inOut(Easing.cubic) }) : target;
    previous.current = { lines: lyrics?.lines, rowHeight, centerOffset };
  }, [lyrics?.lines, rowHeight, centerOffset, target, offset]);
  useFocusEffect(useCallback(() => { offset.set(latestTarget.current); }, [offset]));
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  if (!lyrics || lyrics.kind !== 'synced') {
    const message = failed ? 'Lyrics couldn’t load. Retry from song options.' : !lyrics ? 'Finding timed lyrics…' : lyrics.kind === 'instrumental' ? 'Instrumental' : lyrics.kind === 'unsynced' ? 'Timed lyrics aren’t available for this song.' : 'No timed lyrics found for this song.';
    return <Pressable accessibilityRole="button" accessibilityLabel="Expand lyrics" onPress={onExpand} style={sectionStyle}><Text numberOfLines={windowHeight < theme.space.xxl ? 1 : 2} style={styles.notice}>{message}</Text></Pressable>;
  }
  const lines = [' ', '♪', ...lyrics.lines.map((line) => line.text || '♪'), ' '];
  return <Pressable accessibilityRole="button" accessibilityLabel="Expand lyrics" accessibilityHint="Show full lyrics over the player" onPress={onExpand} style={sectionStyle}>
    <View style={[styles.window, { height: windowHeight }]} aria-live="off">
      <Animated.View style={motion}>{lines.map((text, row) => <SnippetLine key={row} text={text} row={row} rowHeight={rowHeight} windowHeight={windowHeight} offset={offset} hidden={Math.abs(row - index - 2) > 1} />)}</Animated.View>
    </View>
  </Pressable>;
}

const SnippetLine = memo(function SnippetLine({ text, row, rowHeight, windowHeight, offset, hidden }: { text: string; row: number; rowHeight: number; windowHeight: number; offset: SharedValue<number>; hidden: boolean }) {
  const styles = useThemeStyles(createStyles);
  const emphasis = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs((row + 0.5) * rowHeight + offset.value - windowHeight / 2) / rowHeight);
    return { opacity: 1 - distance * 0.7 };
  });
  return <View aria-hidden={hidden} style={[styles.line, { height: rowHeight }]}><Animated.Text numberOfLines={2} style={[styles.current, emphasis]}>{text}</Animated.Text></View>;
});

const createStyles = (theme: Theme) => ({
  section: { minHeight: theme.dock.lyricHeight, justifyContent: 'center' as const, alignItems: 'center' as const, marginVertical: theme.space.lg },
  window: { width: '100%' as const, overflow: 'hidden' as const },
  line: { justifyContent: 'center' as const, alignItems: 'center' as const },
  compact: { marginVertical: theme.space.sm },
  current: { ...theme.type.caption, width: '100%' as const, color: theme.colors.text, textAlign: 'center' as const },
  notice: { ...theme.type.caption, color: theme.colors.muted, textAlign: 'center' as const },
});
