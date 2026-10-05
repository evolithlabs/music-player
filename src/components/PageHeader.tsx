import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { RoundButton } from './Matte';

export function PageHeader({ title, backTo = '/settings' }: { title: string; backTo?: '/settings' | '/library' }) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.row}><RoundButton icon="arrow-back" label={title ? `Back from ${title}` : 'Back to Library'} onPress={() => { if (router.canGoBack()) router.back(); else router.replace(backTo); }} />{!!title && <Text style={styles.title}>{title}</Text>}</View>;
}
const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, marginBottom: theme.space.xl },
  title: { ...theme.type.title, fontWeight: '600' as const, color: theme.colors.text },
});
