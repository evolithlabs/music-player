import { useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { ScrollView, Text, View } from 'react-native';

import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { Recessed } from '../components/Matte';
import { getDatabase } from '../database';
import type { ListeningStats } from '../database/types';
import { useLibrary } from '../state/LibraryProvider';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export default function AboutScreen() {
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const { tracks } = useLibrary();
  const focused = useIsFocused();
  const [stats, setStats] = useState<ListeningStats>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    const refresh = () => { void getDatabase().then((db) => db.getListeningStats()).then((value) => { if (active) { setStats(value); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); };
    refresh(); const timer = setInterval(refresh, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [focused]);
  return <Screen><PageHeader title="About" /><ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}><Text style={styles.title}>GROOVIO</Text><Text style={styles.caption}>Version 1.0.0</Text><Text style={styles.body}>Local music, your way.</Text><Text style={styles.body}>Your songs, playlists and listening history stay on this device.</Text><Text style={styles.sectionTitle}>On this device</Text><Recessed style={styles.stats}>{[{ value: tracks.filter((track) => track.fileState !== 'missing').length, label: 'Songs' }, { value: stats?.plays ?? '—', label: 'Plays' }, { value: stats ? Math.floor(stats.heardSeconds / 60) : '—', label: 'Minutes' }].map((item) => <View key={item.label} style={styles.stat}><Text style={styles.number}>{item.value}</Text><Text style={styles.caption}>{item.label}</Text></View>)}</Recessed>{failed && <Text accessibilityRole="alert" style={styles.error}>Listening stats couldn’t load.</Text>}<Text style={styles.caption}>Song discovery · Deezer{ '\n' }Recording metadata · MusicBrainz{ '\n' }Timed lyrics · LRCLIB</Text></ScrollView></Screen>;
}
const createStyles = (theme: Theme) => ({
  content: { gap: theme.space.lg, paddingTop: theme.space.xl },
  title: { ...theme.type.heading, color: theme.colors.text, letterSpacing: theme.space.xs },
  body: { ...theme.type.body, color: theme.colors.text },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  sectionTitle: { ...theme.type.action, color: theme.colors.text, marginTop: theme.space.md },
  stats: { flexDirection: 'row' as const, paddingVertical: theme.space.lg },
  stat: { flex: 1, alignItems: 'center' as const, gap: theme.space.xs },
  number: { ...theme.type.heading, color: theme.colors.text },
  error: { ...theme.type.caption, color: theme.colors.error },
});
