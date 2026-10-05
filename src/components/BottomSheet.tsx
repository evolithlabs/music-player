import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { useBackdrop } from '../state/BackdropProvider';
import { Theme } from '../theme';
import { MattePanel, RoundButton } from './Matte';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function BottomSheet({ visible, onClose, children, title, scrollable = true }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; scrollable?: boolean }>) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const blurTarget = useBackdrop();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [closing, setClosing] = useState(false);
  const [previousVisible, setPreviousVisible] = useState(visible);
  if (previousVisible !== visible) {
    setPreviousVisible(visible);
    setClosing(false);
    if (visible) setMounted(true);
  }
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(height);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const finishClosing = useCallback((dismissed: boolean) => {
    setMounted(false);
    setClosing(false);
    if (dismissed) closeRef.current();
  }, []);
  useEffect(() => {
    if (visible && !closing) {
      progress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finishClosing, closing);
      });
    }
    return () => cancelAnimation(progress);
  }, [visible, closing, progress, finishClosing]);
  const backdropAnimation = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetAnimation = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * sheetHeight.value }] }));
  const dismiss = () => setClosing(true);
  return <Modal visible={mounted} transparent animationType="none" onRequestClose={dismiss}>
    <View style={styles.root}>
      <AnimatedBlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurView" intensity={45} tint={theme.dark ? 'dark' : 'light'} style={[styles.fill, backdropAnimation]} />
      <Animated.View style={[styles.fill, backdropAnimation]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss options" onPress={dismiss} style={[styles.fill, styles.dim]} />
      </Animated.View>
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetArea}>
        <Animated.View onLayout={(event) => { sheetHeight.value = event.nativeEvent.layout.height; }} style={[styles.sheetFrame, sheetAnimation]}>
          <MattePanel style={[styles.sheet, { paddingBottom: Math.max(theme.space.lg, insets.bottom) }]}>
            <View style={styles.handle} /><View style={styles.header}><Text style={styles.title}>{title}</Text><RoundButton icon="close" label={`Close ${title}`} size="track" onPress={dismiss} /></View>
            {scrollable ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView> : children}
          </MattePanel>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}
const createStyles = (theme: Theme) => ({
  root: { flex: 1 },
  fill: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  dim: { backgroundColor: theme.colors.overlay },
  sheetArea: { flex: 1, justifyContent: 'flex-end' as const },
  sheetFrame: { width: '100%' as const, maxWidth: theme.dock.maxWidth, maxHeight: '85%' as const, alignSelf: 'center' as const, flexShrink: 1 },
  sheet: { flexShrink: 1, padding: theme.layout.contentInset, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handle: { width: theme.size.smallControl, height: theme.size.border * 3, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, alignSelf: 'center' as const, marginBottom: theme.space.lg },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: theme.space.lg, gap: theme.space.sm },
  title: { ...theme.type.title, color: theme.colors.text, flex: 1 },
});
