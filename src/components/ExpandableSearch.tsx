import { RefObject, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { IconButton } from './Matte';

export function ExpandableSearch({ open, onOpenChange, query, onChangeText, onClear, onSearch, inputRef, inputLabel = 'Song or artist', showLabel = 'Show search', searchLabel = 'Search music', clearLabel = 'Clear search', hideLabel = 'Hide search', loading = false, disabled = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; query: string; onChangeText: (text: string) => void; onClear: () => void; onSearch: () => void; inputRef?: RefObject<TextInput | null>; inputLabel?: string; showLabel?: string; searchLabel?: string; clearLabel?: string; hideLabel?: string; loading?: boolean; disabled?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const localInput = useRef<TextInput>(null);
  const searchInput = inputRef ?? localInput;
  const [focused, setFocused] = useState(false);
  const [width, setWidth] = useState(theme.size.trackControl);
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withTiming(open ? 1 : 0, { duration: 280, easing: Easing.inOut(Easing.cubic) });
    if (open) searchInput.current?.focus(); else searchInput.current?.blur();
  }, [open, reveal, searchInput]);
  const searchReveal = useAnimatedStyle(() => ({ width: theme.size.trackControl + reveal.value * Math.max(0, width - theme.size.trackControl) }));
  const searchMotion = useAnimatedStyle(() => ({ opacity: reveal.value }));
  return <View style={styles.slot} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
    <Animated.View style={[styles.search, searchReveal]}>
      <Animated.View pointerEvents="none" style={[styles.background, focused && styles.focused, searchMotion]} />
      <Animated.View pointerEvents={open ? 'auto' : 'none'} aria-hidden={!open} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[styles.fields, searchMotion]}>
        <TextInput ref={searchInput} editable={open} accessibilityLabel={inputLabel} value={query} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChangeText={onChangeText} onSubmitEditing={onSearch} returnKeyType="search" autoCapitalize="none" autoCorrect={false} placeholder="Search…" placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.accent} style={styles.input} />
        <IconButton icon="close" label={query ? clearLabel : hideLabel} onPress={() => { if (query) onClear(); else onOpenChange(false); }} />
      </Animated.View>
      <IconButton icon={loading ? 'hourglass-outline' : 'search-outline'} label={!open ? showLabel : loading ? 'Searching music' : searchLabel} disabled={open && (loading || disabled)} onPress={() => { if (open) onSearch(); else onOpenChange(true); }} />
    </Animated.View>
  </View>;
}

const createStyles = (theme: Theme) => ({
  slot: { flex: 1, height: theme.size.trackControl, minWidth: 0 },
  search: { position: 'absolute' as const, right: 0, height: theme.size.trackControl, flexDirection: 'row' as const, alignItems: 'center' as const, overflow: 'hidden' as const, borderRadius: theme.radius.pill },
  background: { position: 'absolute' as const, inset: 0, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.highlight },
  fields: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, overflow: 'hidden' as const },
  focused: { borderColor: theme.colors.accent },
  input: { ...theme.type.body, flex: 1, minWidth: 0, color: theme.colors.text, paddingHorizontal: theme.space.sm, paddingVertical: theme.space.xs, outlineWidth: 0, outlineStyle: 'solid' as const },
});
