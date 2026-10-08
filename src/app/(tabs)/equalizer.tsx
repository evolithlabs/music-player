import { localPreferences } from '../../database';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { FilterChips } from '../../components/FilterChips';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { useScreenBottomInset } from '../../hooks/useScreenBottomInset';
import { useTheme, useThemeStyles } from '../../state/ThemeProvider';
import { Theme } from '../../theme';

const frequencies = ['60', '150', '400', '1K', '2.4K', '6K', '14K'];
const presets = { Flat: [0, 0, 0, 0, 0, 0, 0], 'Bass Boost': [5, 4, 2, 0, -1, 0, 1], Vocal: [-2, -1, 2, 4, 3, 1, -1], Treble: [-1, -1, 0, 0, 2, 4, 5] };
type Preset = keyof typeof presets | 'Custom';
export default function EqualizerScreen() {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  const [gains, setGains] = useState(presets.Flat);
  const [preset, setPreset] = useState<Preset>('Flat');
  const [error, setError] = useState<string | null>(null);
  const touched = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void localPreferences.getItem('groovio.equalizer.v1').then((raw) => {
      if (!active || touched.current || !raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.gains) && saved.gains.length === frequencies.length && saved.gains.every((value: unknown) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 12)) {
        setGains(saved.gains); setPreset(saved.preset in presets ? saved.preset : 'Custom');
      }
    }).catch(() => { if (active) setError('Could not restore your equalizer settings.'); });
    return () => { active = false; };
  }, []);
  function update(values: number[], name: Preset) {
    touched.current = true; setGains(values); setPreset(name); setError(null);
    const operation = writes.current.then(() => localPreferences.setItem('groovio.equalizer.v1', JSON.stringify({ gains: values, preset: name })));
    writes.current = operation.catch(() => setError('Could not save your equalizer settings.'));
  }
  function change(index: number, value: number) { update(gains.map((gain, i) => i === index ? Math.max(-12, Math.min(12, Math.round(value))) : gain), 'Custom'); }
  return <Screen><PageHeader title="Equalizer" /><ScrollView contentContainerStyle={{ paddingBottom: bottomInset }} showsVerticalScrollIndicator={false}>
    <View style={styles.preset}><Text style={styles.title}>{preset}</Text><Text style={styles.unit}>±12 dB</Text></View>
    <View style={styles.bands}>{frequencies.map((frequency, index) => <View key={frequency} style={styles.band}>
      <Pressable accessibilityRole="adjustable" accessibilityLabel={`${frequency} Hz gain`} aria-valuemin={-12} aria-valuemax={12} aria-valuenow={gains[index]} accessibilityValue={{ min: -12, max: 12, now: gains[index], text: `${gains[index]} dB` }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={({ nativeEvent }) => change(index, gains[index] + (nativeEvent.actionName === 'increment' ? 1 : -1))}
        {...(Platform.OS === 'web' ? { onKeyDown: (event: KeyboardEvent) => { if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) { event.preventDefault(); change(index, gains[index] + (['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1)); } } } : {})}
        onPress={({ nativeEvent }) => change(index, 12 - nativeEvent.locationY / (theme.size.albumArtwork + theme.space.xxl) * 24)} style={styles.slider}><View pointerEvents="none" style={styles.rail} /><View pointerEvents="none" style={[styles.knob, { top: `${(12 - gains[index]) / 24 * 100}%` }]} /></Pressable>
      <Text style={styles.frequency}>{frequency}</Text><Text style={styles.gain}>{gains[index] > 0 ? '+' : ''}{gains[index]}</Text>
    </View>)}</View>
    <FilterChips options={Object.keys(presets) as Preset[]} selected={preset} onSelect={(name) => { if (name === 'Custom') update([...gains], name); else update([...presets[name]], name); }} />
    <Text style={styles.note}>Equalizer preview. Your presets are saved; audio processing will be connected in a future update.</Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </ScrollView></Screen>;
}
const createStyles = (theme: Theme) => ({
  preset: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, padding: theme.layout.contentInset, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface, boxShadow: theme.shadows.inset },
  title: { ...theme.type.title, color: theme.colors.text },
  unit: { ...theme.type.caption, color: theme.colors.muted },
  bands: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginVertical: theme.space.xxl },
  band: { flex: 1, alignItems: 'center' as const },
  slider: { height: theme.size.albumArtwork + theme.space.xxl, width: '100%' as const, alignItems: 'center' as const },
  rail: { height: '100%' as const, width: theme.size.progress, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, boxShadow: theme.shadows.inset },
  knob: { position: 'absolute' as const, width: theme.size.smallIcon, height: theme.size.smallIcon, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, boxShadow: theme.shadows.accent, transform: [{ translateY: -theme.size.smallIcon / 2 }] },
  frequency: { ...theme.type.time, color: theme.colors.muted, marginTop: theme.space.lg },
  gain: { ...theme.type.time, color: theme.colors.accent, marginTop: theme.space.xs },
  note: { ...theme.type.caption, color: theme.colors.muted, marginTop: theme.space.lg },
  error: { ...theme.type.caption, color: theme.colors.error, marginTop: theme.space.lg },
});
