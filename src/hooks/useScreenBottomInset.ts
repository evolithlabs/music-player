import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../state/ThemeProvider';

// Keep the scroll viewport behind the dock, while letting the final item clear it.
export function useScreenBottomInset() {
  const height = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return Math.max(height, insets.bottom) + theme.layout.contentInset;
}
