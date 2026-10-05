import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { usePlayback } from '../state/PlaybackProvider';
import { useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { formatTime } from '../utils/playback';

export function SeekBar({ dock = false, hideTimes = false, divider = false }: { dock?: boolean; hideTimes?: boolean; divider?: boolean }) {
  const playback = usePlayback();
  const styles = useThemeStyles(createStyles);
  const [width, setWidth] = useState(0);
  const seekTarget = useRef<View>(null);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = playback.progress;
    if (playback.playing && !playback.buffering && playback.duration > 0) {
      progress.value = withTiming(Math.min(1, (playback.currentTime + 0.35) / playback.duration), { duration: 350, easing: Easing.linear });
    }
  }, [playback.progress, playback.currentTime, playback.duration, playback.playing, playback.buffering, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const timeline = <View pointerEvents="none" style={[styles.track, divider && styles.dividerTrack]}><Animated.View style={[styles.fill, fillStyle]} /></View>;
  return <View style={divider && styles.divider}>
    {!hideTimes && <View style={styles.times}><Text style={[styles.time, dock && styles.dockTime]}>{formatTime(playback.currentTime)}</Text><Text style={[styles.time, dock && styles.dockTime]}>{formatTime(playback.duration)}</Text></View>}
    <Pressable ref={seekTarget} accessibilityRole="adjustable" accessibilityLabel="Playback position" disabled={!playback.loaded}
      {...(Platform.OS === 'web' ? { onKeyDown: (event: KeyboardEvent) => {
        if (!playback.loaded || !['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const seconds = event.key === 'Home' ? 0 : event.key === 'End' ? playback.duration : playback.currentTime + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 10 : -10);
        void playback.seek(seconds);
      } } : {})}
      aria-valuemin={0} aria-valuemax={Math.floor(playback.duration)} aria-valuenow={Math.floor(playback.currentTime)} aria-valuetext={formatTime(playback.currentTime)}
      accessibilityValue={{ min: 0, max: Math.floor(playback.duration), now: Math.floor(playback.currentTime), text: formatTime(playback.currentTime) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => { void playback.seek(playback.currentTime + (nativeEvent.actionName === 'increment' ? 10 : -10)); }}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      onPress={({ nativeEvent }) => {
        const seekAt = (position: number, trackWidth: number) => {
          if (trackWidth > 0 && Number.isFinite(position)) void playback.seek(Math.max(0, Math.min(1, position / trackWidth)) * playback.duration);
        };
        if (Platform.OS === 'web') {
          // Web Pressable forwards a MouseEvent; it has clientX rather than locationX.
          const { clientX } = nativeEvent as unknown as { clientX: number };
          seekTarget.current?.measureInWindow((left, _top, trackWidth) => seekAt(clientX - left, trackWidth));
        } else seekAt(nativeEvent.locationX, width);
      }}
      style={styles.seek}>
      {timeline}
    </Pressable>
  </View>;
}

const createStyles = (theme: Theme) => ({
  seek: { height: theme.space.lg, justifyContent: 'center' as const },
  track: { height: theme.size.progress / 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, overflow: 'hidden' as const },
  fill: { height: '100%' as const, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  times: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  time: { ...theme.type.time, color: theme.colors.muted },
  dockTime: { color: theme.dock.muted },
  divider: { position: 'absolute' as const, bottom: -theme.space.lg / 2, left: 0, right: 0, zIndex: 2 },
  dividerTrack: { height: theme.size.border, backgroundColor: theme.colors.muted, borderRadius: 0 },
});
