import { Tabs } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { BottomDock } from '../components/BottomDock';
import { BackdropProvider } from '../state/BackdropProvider';
import { DownloadsProvider } from '../state/DownloadsProvider';
import { LibraryProvider } from '../state/LibraryProvider';
import { PlaybackProvider } from '../state/PlaybackProvider';
import { PlaylistProvider } from '../state/PlaylistProvider';
import { ThemeProvider, useTheme } from '../state/ThemeProvider';

function ThemedTabs() {
  const { theme } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: theme.colors.accent, background: theme.colors.background, card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border, notification: theme.colors.accent } };
  }, [theme]);
  return <NavigationThemeProvider value={navigationTheme}>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    <BackdropProvider><Tabs backBehavior="history" tabBar={(props) => <BottomDock {...props} />} screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' }, sceneStyle: { backgroundColor: theme.colors.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="downloads" options={{ title: 'Downloads', href: null }} />
      <Tabs.Screen name="now-playing" options={{ title: 'Now Playing', href: null }} />
      <Tabs.Screen name="appearance" options={{ title: 'Appearance', href: null }} />
      <Tabs.Screen name="equalizer" options={{ title: 'Equalizer', href: null }} />
      <Tabs.Screen name="sleep-timer" options={{ title: 'Sleep timer', href: null }} />
      <Tabs.Screen name="about" options={{ title: 'About', href: null }} />
      <Tabs.Screen name="collection" options={{ title: 'Collection', href: null }} />
    </Tabs></BackdropProvider>
  </NavigationThemeProvider>;
}

export default function RootLayout() {
  return <ThemeProvider><LibraryProvider><PlaylistProvider><PlaybackProvider><DownloadsProvider><ThemedTabs /></DownloadsProvider></PlaybackProvider></PlaylistProvider></LibraryProvider></ThemeProvider>;
}
