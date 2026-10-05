import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { PageHeader } from '../components/PageHeader';
import { MattePanel } from '../components/Matte';
import { Screen } from '../components/Screen';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { formatTime } from '../utils/playback';

const options = [{ label: 'Off', value: null }, ...[10, 20, 30, 60, 120, 180].map((value) => ({ label: value < 60 ? `In ${value} minutes` : `In ${value / 60} ${value === 60 ? 'hour' : 'hours'}`, value })), { label: 'When current track ends', value: 'end' as const }];
export default function SleepTimerScreen() {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const { track, sleepTimer, setSleepTimer } = usePlayback();
  const [now, setNow] = useState(Date.now);
  const focused = useIsFocused();
  useEffect(() => { if (!focused) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [focused]);
  return <Screen><PageHeader title="Sleep timer" /><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
    {sleepTimer.mode === 'time' && <Text style={styles.countdown}>Music stops in {formatTime(Math.max(0, (sleepTimer.deadline - now) / 1000))}</Text>}
    <MattePanel style={styles.options}>{options.map((option, index) => {
      const selected = option.value === null ? sleepTimer.mode === 'off' : option.value === 'end' ? sleepTimer.mode === 'end' : sleepTimer.mode === 'time' && sleepTimer.minutes === option.value;
      const disabled = option.value === 'end' && !track;
      return <Pressable key={option.label} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} disabled={disabled} onPress={() => setSleepTimer(option.value)} style={[styles.row, index === options.length - 1 && styles.lastRow, disabled && styles.disabled]}><Text style={styles.label}>{option.label}</Text>{selected && <Ionicons name="checkmark-circle-outline" size={theme.size.icon} color={theme.colors.accent} />}</Pressable>;
    })}</MattePanel><Text style={styles.note}>Playback pauses when the timer finishes. Choosing Off cancels it.</Text>
  </ScrollView></Screen>;
}
const createStyles = (theme: Theme) => ({
  options: { paddingHorizontal: theme.layout.contentInset, paddingVertical: theme.space.sm, borderRadius: theme.radius.card },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, minHeight: theme.size.track, borderBottomWidth: theme.size.border, borderBottomColor: theme.colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { ...theme.type.body, color: theme.colors.text },
  countdown: { ...theme.type.action, color: theme.colors.accent, textAlign: 'center' as const, marginBottom: theme.space.lg },
  note: { ...theme.type.caption, color: theme.colors.muted, marginTop: theme.space.lg, padding: theme.space.sm },
  disabled: { opacity: theme.opacity.disabled },
});
