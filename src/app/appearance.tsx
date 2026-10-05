import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { PageHeader } from '../components/PageHeader';
import { Artwork } from '../components/Artwork';
import { useScreenBottomInset } from '../hooks/useScreenBottomInset';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme, themes } from '../theme';

export default function AppearanceScreen() {
  const { theme, selectTheme, error } = useTheme();
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  return <Screen>
    <PageHeader title="Appearance" />
    <Text style={styles.description}>Sculpted depth. Soft charcoal. A touch of ember.</Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}>
      {themes.map((option) => {
        const selected = option.id === theme.id;
        return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.name} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={() => selectTheme(option.id)} style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
          <LinearGradient colors={option.gradients.panel} style={[styles.preview, { borderColor: option.colors.highlight }]}>
            <Text style={styles.eyebrow}>NOW PLAYING</Text>
            <Artwork size={theme.size.albumArtwork} raised />
            <View style={styles.previewControls}><View style={styles.previewSkip}><Ionicons name="play-skip-back" size={theme.size.smallIcon} color={option.colors.muted} /></View><LinearGradient colors={option.gradients.accent} style={[styles.previewPlay, { boxShadow: option.shadows.accent }]}><Ionicons name="play" size={theme.size.icon} color={option.colors.onAccent} /></LinearGradient><View style={styles.previewSkip}><Ionicons name="play-skip-forward" size={theme.size.smallIcon} color={option.colors.muted} /></View></View>
          </LinearGradient>
          <View style={styles.optionDetails}><View style={styles.optionText}><Text style={styles.title}>{option.name}</Text><Text style={styles.caption}>{option.description}</Text></View><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={theme.size.icon} color={selected ? theme.colors.accent : theme.colors.muted} /></View>
          <View style={styles.palette}>{[option.colors.background, option.colors.surface, option.colors.text, option.colors.accent].map((color) => <View key={color} style={[styles.swatch, { backgroundColor: color }]} />)}<Text style={styles.paletteLabel}>Active appearance</Text></View>
        </Pressable>;
      })}
      <Text style={styles.note}>Applied throughout Groovio. Saved on this device.</Text>
    </ScrollView>
  </Screen>;
}

const createStyles = (theme: Theme) => ({
  eyebrow: { ...theme.type.eyebrow, color: theme.colors.muted },
  description: { ...theme.type.body, color: theme.colors.muted, marginTop: theme.space.sm, marginBottom: theme.space.xl },
  list: { gap: theme.space.lg },
  option: { width: '100%' as const, maxWidth: theme.dock.maxWidth, alignSelf: 'center' as const, borderRadius: theme.radius.card, borderWidth: theme.size.border, borderColor: theme.colors.transparent },
  selected: { backgroundColor: theme.colors.recessed, borderColor: theme.colors.border },
  preview: { borderTopLeftRadius: theme.radius.card, borderTopRightRadius: theme.radius.card, borderBottomWidth: theme.size.border, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.space.lg, paddingVertical: theme.space.xl },
  previewControls: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xl },
  previewSkip: { width: theme.size.trackControl, height: theme.size.trackControl, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, boxShadow: theme.shadows.raised, alignItems: 'center' as const, justifyContent: 'center' as const },
  previewPlay: { width: theme.size.thumbnail, height: theme.size.thumbnail, borderRadius: theme.radius.pill, alignItems: 'center' as const, justifyContent: 'center' as const },
  optionDetails: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, padding: theme.space.md },
  optionText: { flex: 1, gap: theme.space.xs },
  title: { ...theme.type.title, color: theme.colors.text },
  caption: { ...theme.type.caption, color: theme.colors.muted },
  palette: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, paddingHorizontal: theme.space.md, paddingBottom: theme.space.md },
  swatch: { width: theme.size.icon, height: theme.size.icon, borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.border },
  paletteLabel: { ...theme.type.time, color: theme.colors.muted, marginLeft: theme.space.xs },
  note: { ...theme.type.caption, color: theme.colors.muted, textAlign: 'center' as const, marginTop: theme.space.sm },
  error: { ...theme.type.body, color: theme.colors.error, marginBottom: theme.space.md },
  pressed: { opacity: theme.opacity.pressed },
});
