import { useEffect, useId, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { usePlayback, useWaveform } from '../state/PlaybackProvider';
import { useTheme } from '../state/ThemeProvider';
import { radialDottedPath } from '../utils/waveform';
import { Artwork } from './Artwork';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function ArtworkVisualizer({ size, haloSize }: { size: number; haloSize?: number }) {
  const playback = usePlayback();
  const peaks = useWaveform();
  const { theme } = useTheme();
  const gradientId = `artwork-wave-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rotation = useSharedValue(0);
  const visibility = useSharedValue(0);
  const playing = playback.playing && !playback.buffering;
  const halo = haloSize ?? theme.space.section;
  const waveScale = halo / theme.space.section;
  const diameter = size + halo * 2;
  const radius = size / 2 + theme.space.xs * waveScale;
  const maxLength = theme.space.lg * waveScale;
  const bars = theme.dock.waveformBars;
  const resting = useMemo(() => Array.from({ length: bars }, (_, index) => {
    const stored = playback.track?.waveform;
    return stored?.length ? stored[Math.floor(index / bars * stored.length)] : 0.15 + 0.7 * (0.5 + 0.5 * Math.sin(index * 1.73)) * (0.35 + 0.65 * Math.abs(Math.sin(index * 0.47)));
  }), [bars, playback.track?.waveform]);
  const amplitudes = useDerivedValue(() => withTiming(
    playing && peaks.value.length ? peaks.value.map((value) => Math.min(1, Math.pow(Math.max(0, value - 0.08) / 0.92, 0.7) * 1.45)) : resting,
    { duration: playing ? 65 : 250 },
  ));
  const wave = useAnimatedProps(() => ({ d: radialDottedPath(amplitudes.value, diameter / 2, radius, theme.space.xs * waveScale, maxLength) }));
  useEffect(() => {
    visibility.value = withTiming(playing ? 1 : 0, { duration: playing ? 320 : 380, easing: Easing.out(Easing.cubic) });
    if (playing) rotation.value = withRepeat(withTiming(rotation.value + 360, { duration: 28000, easing: Easing.linear }), -1);
    else cancelAnimation(rotation);
    return () => cancelAnimation(rotation);
  }, [playing, rotation, visibility]);
  const motion = useAnimatedStyle(() => ({ opacity: visibility.value, transform: [{ rotate: `${rotation.value}deg` }, { scale: 0.94 + visibility.value * 0.06 }] }));
  return <View style={{ width: diameter, height: diameter, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', inset: 0 }, motion]}>
      <Svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        <Defs><RadialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx={diameter / 2} cy={diameter / 2} r={radius + maxLength}>
          <Stop offset="0%" stopColor={theme.colors.muted} stopOpacity={theme.opacity.placeholder} />
          <Stop offset={`${radius / (radius + maxLength) * 100}%`} stopColor={theme.colors.muted} stopOpacity={theme.opacity.placeholder} />
          <Stop offset="100%" stopColor={theme.colors.accent} />
        </RadialGradient></Defs>
        <AnimatedPath animatedProps={wave} fill="none" stroke={`url(#${gradientId})`} strokeWidth={theme.size.border * 2} strokeDasharray={[0.1, theme.space.xs + 0.9]} strokeLinecap="round" />
      </Svg>
    </Animated.View>
    <Artwork uri={playback.track?.artworkUri} size={size} />
  </View>;
}
