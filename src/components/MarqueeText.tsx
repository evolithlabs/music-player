import { useEffect, useState } from 'react';
import { ScrollView, StyleProp, Text, TextStyle, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '../state/ThemeProvider';

// A horizontal measuring surface keeps the text's natural width on both native and web.
export function MarqueeText({ children, style }: { children: string; style: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const offset = useSharedValue(0);
  const overflow = Math.max(0, textWidth - width);
  const cycleWidth = textWidth + theme.space.xl;
  useEffect(() => {
    cancelAnimation(offset);
    offset.value = overflow > 0 ? -cycleWidth : 0;
    if (overflow > 0 && width > 0) {
      offset.value = withRepeat(withDelay(1600, withTiming(0, { duration: cycleWidth * 85, easing: Easing.linear })), -1);
    }
    return () => cancelAnimation(offset);
  }, [children, overflow, width, cycleWidth, offset]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  return <View style={{ width: '100%', overflow: 'hidden' }} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
    <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} pointerEvents="none" contentContainerStyle={{ minWidth: '100%', justifyContent: 'center' }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xl }, motion]}>
        <Text style={[style, { flexShrink: 0 }]} onLayout={({ nativeEvent }) => setTextWidth(nativeEvent.layout.width)}>{children}</Text>
        {overflow > 0 && <Text aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[style, { flexShrink: 0 }]}>{children}</Text>}
      </Animated.View>
    </ScrollView>
  </View>;
}
