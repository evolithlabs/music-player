import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, Text, Pressable, View } from 'react-native';

import { Screen } from '../components/Screen';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const { sleepTimer } = usePlayback();
  const options = [
    { title: 'Appearance', description: theme.name, icon: 'color-palette-outline', route: '/appearance' },
    { title: 'Equalizer', description: 'Presets and sound controls', icon: 'options-outline', route: '/equalizer' },
    { title: 'Sleep timer', description: sleepTimer.mode === 'off' ? 'Drift off to your music' : sleepTimer.mode === 'end' ? 'When the current song ends' : `Set for ${sleepTimer.minutes} minutes`, icon: 'moon-outline', route: '/sleep-timer' },
    { title: 'About', description: 'Version 1.0.0', icon: 'information-circle-outline', route: '/about' },
  ] as const;
  return <Screen><Text style={styles.heading}>Settings</Text><ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
    {options.map((option) => <Pressable key={option.title} accessibilityRole="button" accessibilityLabel={option.title} onPress={() => router.push(option.route)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={option.icon} size={theme.size.icon} color={theme.colors.text} /></View><View style={styles.details}><Text style={styles.title}>{option.title}</Text><Text style={styles.description}>{option.description}</Text></View><Ionicons name="chevron-forward" size={theme.size.smallIcon} color={theme.colors.muted} /></Pressable>)}
  </ScrollView></Screen>;
}
const createStyles = (theme: Theme) => ({
  heading: { ...theme.type.heading, color: theme.colors.text, marginVertical: theme.space.md },
  list: { paddingTop: theme.space.xl },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, minHeight: theme.size.control + theme.space.md, borderBottomWidth: theme.size.border, borderBottomColor: theme.colors.border },
  icon: { width: theme.size.trackControl, alignItems: 'center' as const },
  details: { flex: 1, gap: theme.space.xs },
  title: { ...theme.type.title, color: theme.colors.text },
  description: { ...theme.type.caption, color: theme.colors.muted },
  pressed: { opacity: theme.opacity.pressed },
});
