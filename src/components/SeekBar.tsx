import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Platform, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { formatTime, seekTime } from '../utils/playback';
import { TimelineWaveform } from './TimelineWaveform';

export function SeekBar({ dock = false, hideTimes = false, divider = false, waveform = false, onWaveformTopChange }: { dock?: boolean; hideTimes?: boolean; divider?: boolean; waveform?: boolean; onWaveformTopChange?: (top: number) => void }) {
  const playback = usePlayback();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const waveformHeight = dock ? theme.space.sm + theme.space.xs : theme.dock.waveformHeight;
  const trackHeight = divider ? theme.size.border : theme.size.progress / 2;
  const [width, setWidth] = useState(0);
  const trackId = playback.track?.id;
  const { duration, loaded, seek } = playback;
  const [preview, setPreview] = useState<{ trackId?: string; duration: number; loaded: boolean; width: number; time: number | null }>({ trackId, duration, loaded, width, time: null });
  if (preview.trackId !== trackId || preview.duration !== duration || preview.loaded !== loaded || preview.width !== width) {
    setPreview({ trackId, duration, loaded, width, time: null });
  }
  const previewTime = preview.time;
  const drag = useRef<{ start: number; pageX: number; time: number; finished: boolean } | null>(null);
  const progress = useSharedValue(0);
  const canSeek = !dock && loaded && width > 0 && duration > 0;
  useEffect(() => {
    drag.current = null;
    return () => { drag.current = null; };
  }, [playback.track?.id, playback.loaded, playback.duration, width]);
  useEffect(() => {
    if (drag.current) return;
    progress.set(playback.progress);
    if (playback.playing && !playback.buffering && playback.duration > 0) {
      progress.set(withTiming(Math.min(1, (playback.currentTime + 0.35) / playback.duration), { duration: 350, easing: Easing.linear }));
    }
  }, [playback.progress, playback.currentTime, playback.duration, playback.playing, playback.buffering, progress, previewTime]);
  const updateDrag = useCallback((position: number) => {
    const current = drag.current;
    const time = seekTime(position, width, duration);
    if (!current || current.finished || time === undefined) return;
    current.time = time;
    progress.set(time / duration);
    setPreview({ trackId, duration, loaded, width, time });
  }, [width, duration, progress, trackId, loaded]);
  const beginDrag = useCallback(({ nativeEvent }: GestureResponderEvent) => {
    if (!canSeek || !Number.isFinite(nativeEvent.locationX) || !Number.isFinite(nativeEvent.pageX)) return;
    drag.current = { start: nativeEvent.locationX, pageX: nativeEvent.pageX, time: 0, finished: false };
    updateDrag(nativeEvent.locationX);
  }, [canSeek, updateDrag]);
  const moveDrag = useCallback(({ nativeEvent }: GestureResponderEvent) => {
    const current = drag.current;
    if (current && nativeEvent.touches.length === 1) updateDrag(current.start + nativeEvent.pageX - current.pageX);
  }, [updateDrag]);
  const endDrag = useCallback(({ nativeEvent }: GestureResponderEvent) => {
    const current = drag.current;
    if (!current || current.finished) return;
    updateDrag(current.start + nativeEvent.pageX - current.pageX);
    current.finished = true;
    const finish = () => {
      if (drag.current !== current) return;
      drag.current = null;
      setPreview((value) => ({ ...value, time: null }));
    };
    void seek(current.time).then(finish, finish);
  }, [updateDrag, seek]);
  const cancelDrag = useCallback(() => { drag.current = null; setPreview((value) => ({ ...value, time: null })); }, []);
  const currentTime = previewTime ?? playback.currentTime;
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: Math.max(theme.space.sm, Math.min(width - theme.space.sm, progress.value * width)) - theme.space.sm }));
  const timeline = <View pointerEvents="none" style={[styles.track, divider && styles.dividerTrack]}><Animated.View style={[styles.fill, fillStyle]} /></View>;
  return <View style={divider && styles.divider} onLayout={({ nativeEvent }) => {
    if (waveform) onWaveformTopChange?.(nativeEvent.layout.height - theme.space.lg / 2 - trackHeight / 2 - waveformHeight);
  }}>
    {!hideTimes && <View style={styles.times}><Text style={[styles.time, dock && styles.dockTime]}>{formatTime(currentTime)}</Text><Text style={[styles.time, dock && styles.dockTime]}>{formatTime(playback.duration)}</Text></View>}
    <View pointerEvents={dock ? 'none' : 'auto'} onStartShouldSetResponder={() => canSeek} onResponderGrant={beginDrag} onResponderMove={moveDrag} onResponderRelease={endDrag} onResponderTerminationRequest={() => false} onResponderTerminate={cancelDrag} accessibilityRole={dock ? 'progressbar' : 'adjustable'} accessibilityLabel={dock ? 'Playback progress' : 'Playback position'} accessibilityState={dock ? undefined : { disabled: !canSeek }} focusable={canSeek} hitSlop={dock ? undefined : { top: theme.space.sm, bottom: theme.space.sm }}
      {...(Platform.OS === 'web' ? { onKeyDown: (event: KeyboardEvent) => {
        if (!canSeek || drag.current || !['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const seconds = event.key === 'Home' ? 0 : event.key === 'End' ? playback.duration : playback.currentTime + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 10 : -10);
        void playback.seek(seconds);
      } } : {})}
      aria-valuemin={0} aria-valuemax={Math.floor(playback.duration)} aria-valuenow={Math.floor(currentTime)} aria-valuetext={formatTime(currentTime)}
      accessibilityValue={{ min: 0, max: Math.floor(playback.duration), now: Math.floor(currentTime), text: formatTime(currentTime) }}
      accessibilityActions={dock ? undefined : [{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => { if (canSeek && !drag.current) void playback.seek(playback.currentTime + (nativeEvent.actionName === 'increment' ? 10 : -10)); }}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={styles.seek}>
      {waveform && width > 0 && <TimelineWaveform key={playback.track?.id} width={width} progress={progress} height={waveformHeight} trackHeight={trackHeight} compact={dock} />}
      {timeline}
      {waveform && !dock && width > 0 && playback.loaded && <Animated.View pointerEvents="none" style={[styles.thumb, thumbStyle]} />}
    </View>
  </View>;
}

const createStyles = (theme: Theme) => ({
  seek: { height: theme.space.lg, justifyContent: 'center' as const, ...(Platform.OS === 'web' ? { touchAction: 'none' as const, userSelect: 'none' as const } : {}) },
  track: { height: theme.size.progress / 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, overflow: 'hidden' as const },
  fill: { height: '100%' as const, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  thumb: { position: 'absolute' as const, width: theme.space.md, height: theme.space.md, bottom: (theme.space.lg - theme.space.md) / 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  times: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  time: { ...theme.type.time, color: theme.colors.muted },
  dockTime: { color: theme.dock.muted },
  divider: { position: 'absolute' as const, bottom: -theme.space.lg / 2, left: 0, right: 0, zIndex: 2 },
  dividerTrack: { height: theme.size.border, backgroundColor: theme.colors.muted, borderRadius: 0 },
});
