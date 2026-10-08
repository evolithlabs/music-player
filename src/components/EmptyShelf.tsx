import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export function EmptyShelf({ message, playlists = false, loading = false, loadingMessage = 'Opening your library…', cardSize, children }: PropsWithChildren<{ message: string; playlists?: boolean; loading?: boolean; loadingMessage?: string; cardSize: number }>) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <View style={[styles.shelf, playlists && styles.playlistShelf]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden pointerEvents="none" style={styles.ghosts}>
      {children ?? [0, 1, 2, 3].map((index) => <View key={index} style={[styles.ghost, { width: cardSize }, playlists && styles.playlist]}>
        <LinearGradient colors={theme.gradients.artwork} start={{ x: index % 2, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, { width: playlists ? theme.size.thumbnail : cardSize, height: playlists ? theme.size.thumbnail : cardSize }]}>
          <View style={[styles.ring, { width: (playlists ? theme.size.thumbnail : cardSize) * 0.68, height: (playlists ? theme.size.thumbnail : cardSize) * 0.68 }]}><View style={styles.innerRing}><View style={styles.discCenter} /></View></View>
        </LinearGradient>
        <View style={[styles.lines, playlists && styles.playlistLines]}><View style={styles.line} /><View style={[styles.line, styles.shortLine]} /></View>
      </View>)}
    </View>
    <LinearGradient pointerEvents="none" colors={theme.gradients.emptyOverlay} style={styles.scrim} />
    <View style={styles.overlay}><Text style={styles.message}>{loading ? loadingMessage : message}</Text>{!loading && <Pressable accessibilityRole="button" accessibilityLabel={playlists ? 'Open Library to pin a playlist' : 'Find music in Search'} onPress={() => router.push(playlists ? '/library' : '/search')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={styles.actionText}>{playlists ? 'Open Library' : 'Find music'}</Text><Ionicons name="arrow-forward" size={theme.size.smallIcon} color={theme.colors.accent} /></Pressable>}</View>
  </View>;
}
const createStyles = (theme: Theme) => ({
  shelf: { overflow: 'hidden' as const, borderRadius: theme.radius.card, minHeight: theme.size.albumArtwork + theme.space.md * 2, justifyContent: 'center' as const },
  playlistShelf: { minHeight: theme.size.thumbnail + theme.space.xxl },
  ghosts: { flexDirection: 'row' as const, gap: theme.space.md, opacity: theme.opacity.placeholder },
  ghost: { gap: theme.space.sm },
  cover: { borderRadius: theme.radius.card / 2, borderWidth: theme.size.border, borderColor: theme.colors.border, alignItems: 'center' as const, justifyContent: 'center' as const },
  ring: { borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.border, alignItems: 'center' as const, justifyContent: 'center' as const },
  innerRing: { width: '65%' as const, height: '65%' as const, borderRadius: theme.radius.pill, borderWidth: theme.size.border, borderColor: theme.colors.border, alignItems: 'center' as const, justifyContent: 'center' as const },
  discCenter: { width: theme.space.xs, height: theme.space.xs, backgroundColor: theme.colors.muted, borderRadius: theme.radius.pill },
  lines: { gap: theme.space.sm, paddingTop: theme.space.xs },
  line: { width: '75%' as const, height: theme.space.sm, backgroundColor: theme.colors.border, borderRadius: theme.radius.pill },
  shortLine: { width: '45%' as const },
  playlist: { flexDirection: 'row' as const, padding: theme.space.md, borderRadius: theme.radius.card, borderWidth: theme.size.border, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' as const },
  playlistLines: { flex: 1 },
  scrim: { position: 'absolute' as const, top: 0, left: 0, bottom: 0, right: 0 },
  overlay: { position: 'absolute' as const, top: 0, left: 0, bottom: 0, right: 0, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.space.sm, padding: theme.space.lg },
  message: { ...theme.type.caption, color: theme.colors.text, textAlign: 'center' as const, maxWidth: theme.size.artwork, lineHeight: theme.type.body.lineHeight },
  action: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, padding: theme.space.xs },
  actionText: { ...theme.type.caption, color: theme.colors.accent, fontWeight: '600' as const },
  pressed: { opacity: theme.opacity.pressed },
});
