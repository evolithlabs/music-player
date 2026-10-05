import { Pressable, ScrollView, Text } from 'react-native';

import { useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export function FilterChips<T extends string>({ options, selected, onSelect }: { options: readonly T[]; selected: T; onSelect: (value: T) => void }) {
  const styles = useThemeStyles(createStyles);
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.chips}>
    {options.map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityLabel={option} accessibilityState={{ selected: selected === option }} aria-selected={selected === option} onPress={() => onSelect(option)} style={({ pressed }) => [styles.chip, option === selected && styles.selected, pressed && styles.pressed]}><Text style={[styles.text, option === selected && styles.selectedText]}>{option}</Text></Pressable>)}
  </ScrollView>;
}
const createStyles = (theme: Theme) => ({
  scroll: { flexGrow: 0, flexShrink: 0, marginVertical: theme.space.lg },
  chips: { gap: theme.space.sm, paddingVertical: theme.space.xs },
  chip: { paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.highlight },
  selected: { backgroundColor: theme.colors.recessed, borderColor: theme.colors.border, boxShadow: theme.shadows.inset },
  text: { ...theme.type.action, color: theme.colors.muted },
  selectedText: { color: theme.colors.accent },
  pressed: { opacity: theme.opacity.pressed },
});
