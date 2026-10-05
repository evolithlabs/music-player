import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, router } from 'expo-router';
import { BottomTabBarHeightCallbackContext } from 'expo-router/js-tabs';
import { ComponentProps, useContext, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { usePlayback } from '../state/PlaybackProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { Artwork } from './Artwork';
import { RoundButton } from './Matte';
import { SeekBar } from './SeekBar';

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const sections = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'search', title: 'Search', icon: 'search-outline' },
  { name: 'library', title: 'Library', icon: 'book-outline' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
] as const;

export function BottomDock(props: Props) {
  const hidden = ['now-playing', 'appearance', 'equalizer', 'sleep-timer', 'about'].includes(props.state.routes[props.state.index].name);
  return <DockBody {...props} hidden={hidden} />;
}
function DockBody({ state, navigation, insets, hidden }: Props & { hidden: boolean }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const playback = usePlayback();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const visibility = useSharedValue(hidden ? 0 : 1);
  const dockHeight = useSharedValue(0);
  useEffect(() => {
    visibility.set(withTiming(hidden ? 0 : 1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    reportHeight?.(hidden ? 0 : dockHeight.get());
  }, [hidden, visibility, dockHeight, reportHeight]);
  const transition = useAnimatedStyle(() => ({ opacity: visibility.value, display: visibility.value > 0 ? 'flex' : 'none', transform: [{ translateY: (1 - visibility.value) * dockHeight.value }] }));
  const currentRoute = state.routes[state.index].name;
  const activeName = ['downloads', 'collection'].includes(currentRoute) ? 'library' : currentRoute;
  return <Animated.View pointerEvents={hidden ? 'none' : 'box-none'} aria-hidden={hidden} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'} onLayout={({ nativeEvent }) => { if (nativeEvent.layout.height > 0) dockHeight.set(nativeEvent.layout.height); if (!hidden) reportHeight?.(nativeEvent.layout.height); }} style={[styles.outer, transition]}>
    <View pointerEvents="box-none" style={styles.dock}>
      <View pointerEvents="box-none" style={[styles.playerInset, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <LinearGradient colors={theme.dock.player} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.player}>
        <View style={styles.playerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open now playing" onPress={() => router.push('/now-playing')} style={styles.details}>
            <Artwork uri={playback.track?.artworkUri} size={theme.size.smallControl} square />
            <View style={styles.metadata}><Text numberOfLines={1} style={styles.title}>{playback.track?.title ?? 'Your next favorite'}</Text><Text numberOfLines={1} style={styles.artist}>{playback.track?.artist ?? 'Choose a song'}</Text></View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous track" disabled={!playback.hasPrevious} onPress={playback.previous} style={[styles.skip, !playback.hasPrevious && styles.disabled]}><Ionicons name="play-skip-back" size={theme.size.smallIcon} color={theme.dock.text} /></Pressable>
          <RoundButton icon={playback.playing ? 'pause' : 'play'} label={playback.playing ? 'Pause' : 'Play'} size="track" filled active disabled={!playback.loaded} onPress={playback.toggle} />
          <Pressable accessibilityRole="button" accessibilityLabel="Next track" disabled={!playback.hasNext} onPress={playback.next} style={[styles.skip, !playback.hasNext && styles.disabled]}><Ionicons name="play-skip-forward" size={theme.size.smallIcon} color={theme.dock.text} /></Pressable>
        </View>
        <SeekBar dock hideTimes divider />
      </LinearGradient>
      </View>
      <LinearGradient colors={theme.dock.navigationGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.navigation, { paddingBottom: insets.bottom }]}>
        <View style={[styles.navigationItems, { paddingLeft: Math.max(theme.space.sm, insets.left), paddingRight: Math.max(theme.space.sm, insets.right) }]}>
        {sections.map((section) => {
          const selected = section.name === activeName;
          const route = state.routes.find((item) => item.name === section.name);
          return <Pressable key={section.name} accessibilityRole="tab" accessibilityLabel={section.title} accessibilityState={{ selected }} aria-selected={selected}
            onPress={() => { if (!route) return; const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (currentRoute !== section.name && !event.defaultPrevented) navigation.navigate(route.name); }}
            onLongPress={() => { if (route) navigation.emit({ type: 'tabLongPress', target: route.key }); }} style={styles.tab}>
            <Ionicons name={selected && section.name === 'index' ? 'home' : section.icon} size={theme.size.smallIcon + theme.space.xs} color={selected ? theme.colors.accent : theme.colors.muted} />
            <Text style={[styles.tabLabel, selected && styles.activeLabel]}>{section.title}</Text>
          </Pressable>;
        })}
        </View>
      </LinearGradient>
    </View>
  </Animated.View>;
}
const createStyles = (theme: Theme) => ({
  outer: { position: 'absolute' as const, left: 0, right: 0, bottom: 0 },
  dock: { width: '100%' as const, maxWidth: theme.dock.maxWidth, alignSelf: 'center' as const },
  playerInset: { width: '100%' as const, zIndex: 1 },
  player: { paddingHorizontal: theme.space.sm + theme.space.xs, paddingVertical: theme.space.sm + theme.space.xs, borderTopLeftRadius: theme.radius.dock, borderTopRightRadius: theme.radius.dock },
  playerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.xs },
  details: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm },
  metadata: { flex: 1, minWidth: 0 },
  title: { ...theme.type.action, color: theme.dock.text, fontSize: theme.type.caption.fontSize },
  artist: { ...theme.type.time, color: theme.dock.muted, marginTop: theme.space.xs / 2 },
  skip: { width: theme.size.trackControl, height: theme.size.smallControl, alignItems: 'center' as const, justifyContent: 'center' as const },
  disabled: { opacity: theme.opacity.disabled },
  navigation: { overflow: 'hidden' as const },
  navigationItems: { flexDirection: 'row' as const, width: '100%' as const, maxWidth: theme.dock.maxWidth, alignSelf: 'center' as const },
  tab: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, height: theme.size.tabBar, gap: theme.space.xs },
  tabLabel: { ...theme.type.time, color: theme.colors.muted },
  activeLabel: { color: theme.colors.accent, fontWeight: '600' as const },
});
