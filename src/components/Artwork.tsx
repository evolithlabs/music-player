import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export function Artwork({ uri, size, raised = false, square = false }: { uri?: string; size?: number; raised?: boolean; square?: boolean }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const diameter = size ?? theme.size.thumbnail;
  const shape = square ? { borderRadius: theme.radius.card / 2 } : undefined;
  return (
    <View style={[styles.frame, { width: diameter, height: diameter }, shape, raised && styles.raised]}>
      {uri && failedUri !== uri ? <Image source={{ uri }} style={[styles.image, shape]} onError={() => setFailedUri(uri)} /> :
        <LinearGradient colors={theme.gradients.artwork} style={[styles.placeholder, shape]}>
          <View style={[styles.record, { width: diameter * 0.76, height: diameter * 0.76 }]}>
            <View style={[styles.record, { width: diameter * 0.58, height: diameter * 0.58 }]}>
              <View style={[styles.label, { width: diameter * 0.28, height: diameter * 0.28 }]}>
                <Ionicons name="musical-note" size={diameter * 0.12} color={theme.colors.muted} />
              </View>
            </View>
          </View>
        </LinearGradient>}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  frame: { borderRadius: theme.radius.artwork, backgroundColor: theme.colors.recessed, padding: theme.size.border, borderWidth: theme.size.border, borderColor: theme.colors.highlight, flexShrink: 0 },
  raised: { boxShadow: theme.shadows.artwork },
  image: { width: '100%' as const, height: '100%' as const, borderRadius: theme.radius.artwork },
  placeholder: { flex: 1, borderRadius: theme.radius.artwork, alignItems: 'center' as const, justifyContent: 'center' as const },
  record: { borderWidth: theme.size.border, borderColor: theme.colors.border, borderRadius: theme.radius.artwork, alignItems: 'center' as const, justifyContent: 'center' as const },
  label: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.artwork, alignItems: 'center' as const, justifyContent: 'center' as const },
});
