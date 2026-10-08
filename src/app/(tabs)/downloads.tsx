import { Text } from 'react-native';

import { DownloadsList } from '../../components/DownloadsList';
import { Screen } from '../../components/Screen';
import { useScreenBottomInset } from '../../hooks/useScreenBottomInset';
import { useThemeStyles } from '../../state/ThemeProvider';
import { Theme } from '../../theme';

export default function DownloadsScreen() {
  const styles = useThemeStyles(createStyles);
  const bottomInset = useScreenBottomInset();
  return <Screen>
    <Text style={styles.heading}>Downloads</Text>
    <Text style={styles.description}>Queued in the cloud. Saved for offline listening.</Text>
    <DownloadsList bottomPadding={bottomInset} />
  </Screen>;
}

const createStyles = (theme: Theme) => ({
  heading: { ...theme.type.heading, color: theme.colors.text, marginTop: theme.space.sm },
  description: { ...theme.type.body, color: theme.colors.muted, marginVertical: theme.space.md },
});
