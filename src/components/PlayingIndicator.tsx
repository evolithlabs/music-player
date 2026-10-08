import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export function PlayingIndicator() {
  const styles = useThemeStyles(createStyles);
  return <View pointerEvents="none" accessibilityLabel="Now playing" style={styles.overlay}><View style={styles.bars}>{[0, 1, 2].map((index) => <PlayingBar key={index} index={index} />)}</View></View>;
}

function PlayingBar({ index }: { index: number }) {
  const { theme } = useTheme();
  const height = useSharedValue(theme.space.xs);
  useEffect(() => {
    height.set(withDelay(index * 130, withRepeat(withSequence(
      withTiming(theme.space.md + index * 2, { duration: 280 + index * 80, easing: Easing.inOut(Easing.quad) }),
      withTiming(theme.space.xs, { duration: 360 - index * 50, easing: Easing.inOut(Easing.quad) }),
    ), -1)));
    return () => cancelAnimation(height);
  }, [height, index, theme.space.md, theme.space.xs]);
  const animated = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[{ width: theme.space.xs, borderRadius: theme.space.xs / 2, backgroundColor: theme.colors.accent }, animated]} />;
}

const createStyles = (theme: Theme) => ({
  overlay: { position: 'absolute' as const, inset: 0, borderRadius: theme.radius.card / 2, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center' as const, justifyContent: 'center' as const },
  bars: { height: theme.space.md + theme.space.xs, flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: theme.space.xs / 2 },
});
