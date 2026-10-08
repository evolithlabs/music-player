import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { catalogIdentity } from '../utils/catalog';

export function PlaybackToast() {
  const playback = usePlayback();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const failure = playback.playError;
  const message = failure?.message;
  const key = failure ? `${failure.catalog ? catalogIdentity(failure.catalog) : failure.trackId}:${message}` : undefined;
  const [visible, setVisible] = useState<string>();
  useEffect(() => {
    if (!key) return;
    const show = setTimeout(() => setVisible(key), 0);
    const hide = setTimeout(() => setVisible(undefined), 7000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [key]);
  if (!key || visible !== key) return null;
  return <View pointerEvents="box-none" style={[styles.position, { top: insets.top + theme.space.md }]}><View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.toast}><Ionicons name="alert-circle-outline" color={theme.colors.error} size={theme.size.icon} /><View style={styles.details}><Text style={styles.title}>Could not play this song</Text><Text style={styles.message}>{message}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Dismiss playback error" hitSlop={theme.space.sm} onPress={() => setVisible(undefined)}><Ionicons name="close" color={theme.colors.muted} size={theme.size.icon} /></Pressable></View></View>;
}

const createStyles = (theme: Theme) => ({
  position: { position: 'absolute' as const, left: theme.layout.contentInset, right: theme.layout.contentInset, zIndex: 1000, alignItems: 'center' as const },
  toast: { width: '100%' as const, maxWidth: theme.dock.maxWidth, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, padding: theme.space.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, borderWidth: theme.size.border, borderColor: theme.colors.border },
  details: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  message: { ...theme.type.caption, color: theme.colors.muted },
});
