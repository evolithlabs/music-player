import { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export function Screen({ children }: PropsWithChildren) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}><LinearGradient pointerEvents="none" colors={theme.gradients.canvas} style={styles.background} />{children}</SafeAreaView>;
}

const createStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.layout.contentInset, paddingTop: theme.layout.contentInset },
  background: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
});
