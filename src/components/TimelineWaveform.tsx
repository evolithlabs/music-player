import { useId, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps, useDerivedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { usePlayback, useWaveform } from '../state/PlaybackProvider';
import { useTheme } from '../state/ThemeProvider';
import { timelineWaveformPath } from '../utils/waveform';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function TimelineWaveform({ width, progress, height, trackHeight, compact = false }: { width: number; progress: SharedValue<number>; height: number; trackHeight: number; compact?: boolean }) {
  const playback = usePlayback();
  const peaks = useWaveform();
  const { theme } = useTheme();
  const clipId = `timeline-wave-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const bars = Math.min(theme.dock.waveformBars, Math.max(1, Math.floor(width / (theme.space.xs + theme.size.border * 2))));
  const playing = playback.playing && !playback.buffering;
  const resting = useMemo(() => {
    if (!playback.track) return [];
    if (playback.track.waveform?.length) return playback.track.waveform;
    return Array.from({ length: theme.dock.waveformBars }, (_, index) => 0.15 + 0.7 * (0.5 + 0.5 * Math.sin(index * 1.73)) * (0.35 + 0.65 * Math.abs(Math.sin(index * 0.47))));
  }, [playback.track, theme.dock.waveformBars]);
  const flat = useMemo(() => Array.from({ length: theme.dock.waveformBars }, () => 0), [theme.dock.waveformBars]);
  const amplitudes = useDerivedValue(() => withTiming(playing ? peaks.value.length ? peaks.value : resting : flat, { duration: playing ? 90 : 250 }));
  const wave = useAnimatedProps(() => ({ d: timelineWaveformPath(amplitudes.value, width, height, bars) }));
  const played = useAnimatedProps(() => ({ width: Math.max(0, Math.min(1, progress.value)) * width }));
  const strokeWidth = theme.size.border * (compact ? 1 : 2);
  if (!playing) return null;
  return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, bottom: (theme.space.lg + trackHeight) / 2, height }}>
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs><ClipPath id={clipId}><AnimatedRect x={0} y={0} height={height} animatedProps={played} /></ClipPath></Defs>
      <AnimatedPath animatedProps={wave} fill="none" stroke={theme.colors.muted} strokeOpacity={theme.opacity.placeholder} strokeWidth={strokeWidth} strokeLinecap="round" />
      <AnimatedPath animatedProps={wave} fill="none" stroke={theme.colors.accent} strokeWidth={strokeWidth} strokeLinecap="round" clipPath={`url(#${clipId})`} />
    </Svg>
  </View>;
}
