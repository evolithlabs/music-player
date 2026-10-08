import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { PlaybackToast } from '../components/PlaybackToast';
import { BackdropProvider } from '../state/BackdropProvider';
import { DownloadsProvider } from '../state/DownloadsProvider';
import { LibraryProvider } from '../state/LibraryProvider';
import { PlaybackProvider } from '../state/PlaybackProvider';
import { PlaylistProvider } from '../state/PlaylistProvider';
import { ThemeProvider, useTheme } from '../state/ThemeProvider';

export const unstable_settings = { anchor: '(tabs)' };

function RootNavigator() {
  const { theme } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: theme.colors.accent, background: theme.colors.background, card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border, notification: theme.colors.accent } };
  }, [theme]);
  return <NavigationThemeProvider value={navigationTheme}>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    <BackdropProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="now-playing" options={{ presentation: 'transparentModal', animation: 'none', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack><PlaybackToast /></BackdropProvider>
  </NavigationThemeProvider>;
}

export default function RootLayout() {
  return <ThemeProvider><LibraryProvider><PlaylistProvider><PlaybackProvider><DownloadsProvider><RootNavigator /></DownloadsProvider></PlaybackProvider></PlaylistProvider></LibraryProvider></ThemeProvider>;
}
