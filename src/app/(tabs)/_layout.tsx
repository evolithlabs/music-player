import { Tabs } from 'expo-router';

import { BottomDock } from '../../components/BottomDock';
import { useTheme } from '../../state/ThemeProvider';

export default function TabLayout() {
  const { theme } = useTheme();
  return <Tabs backBehavior="history" tabBar={(props) => <BottomDock {...props} />} screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' }, sceneStyle: { backgroundColor: theme.colors.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="search" options={{ title: 'Search' }} />
    <Tabs.Screen name="library" options={{ title: 'Library' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    <Tabs.Screen name="downloads" options={{ title: 'Downloads', href: null }} />
    <Tabs.Screen name="appearance" options={{ title: 'Appearance', href: null }} />
    <Tabs.Screen name="equalizer" options={{ title: 'Equalizer', href: null }} />
    <Tabs.Screen name="sleep-timer" options={{ title: 'Sleep timer', href: null }} />
    <Tabs.Screen name="about" options={{ title: 'About', href: null }} />
    <Tabs.Screen name="collection" options={{ title: 'Collection', href: null }} />
    <Tabs.Screen name="artist" options={{ title: 'Artist', href: null }} />
  </Tabs>;
}
