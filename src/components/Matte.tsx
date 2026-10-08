import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';

export function MattePanel({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <LinearGradient colors={theme.gradients.panel} style={[styles.panel, style]}>{children}</LinearGradient>;
}

type ButtonOptions = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: 'track' | 'small' | 'regular' | 'large';
  selected?: boolean;
  filled?: boolean;
};

type ButtonProps = ButtonOptions & ({ family?: 'ionicons'; icon: ComponentProps<typeof Ionicons>['name'] } | { family: 'feather'; icon: ComponentProps<typeof Feather>['name'] });

export function RoundButton({ icon, family, label, onPress, disabled, active, filled = false, size = 'small', selected, iconStyle }: ButtonProps & { iconStyle?: ComponentProps<typeof Animated.View>['style'] }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const diameter = size === 'large' ? theme.size.play : size === 'regular' ? theme.size.control : size === 'track' ? theme.size.trackControl : theme.size.smallControl;
  const iconSize = size === 'large' ? theme.space.xxl : size === 'regular' ? theme.size.icon : theme.size.smallIcon;
  const iconColor = filled && active ? theme.colors.onAccent : theme.colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} aria-disabled={!!disabled} aria-selected={selected} accessibilityState={{ disabled: !!disabled, ...(selected !== undefined ? { selected } : {}) }} disabled={disabled} onPress={(event) => { event.stopPropagation(); onPress?.(); }} hitSlop={theme.space.sm}
      style={({ pressed }) => [styles.button, { width: diameter, height: diameter }, filled && { backgroundColor: active ? theme.colors.accent : theme.colors.surface }, disabled && styles.disabled, pressed && styles.pressed]}>
      <Animated.View pointerEvents="none" style={[styles.buttonFill, iconStyle]}>
        {family === 'feather' ? <Feather name={icon} size={iconSize} color={iconColor} /> : <Ionicons name={icon} size={iconSize} color={iconColor} />}
      </Animated.View>
    </Pressable>
  );
}

type IconButtonProps = (ButtonProps | (ButtonOptions & { family: 'material-community'; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] })) & { textAligned?: boolean };

export function IconButton({ icon, family, label, onPress, disabled, active, size = 'track', selected, textAligned = false }: IconButtonProps) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const diameter = textAligned ? theme.type.body.lineHeight ?? theme.size.icon : size === 'small' ? theme.size.smallControl : theme.size.trackControl;
  const iconSize = theme.size.smallIcon + (size === 'small' ? theme.space.xs : 0);
  const iconColor = active ? theme.colors.accent : theme.colors.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, ...(selected !== undefined ? { selected } : {}) }} disabled={disabled} onPress={(event) => { event.stopPropagation(); onPress?.(); }} hitSlop={textAligned ? theme.space.sm : theme.space.xs} style={({ pressed }) => [styles.iconButton, { width: diameter, height: diameter }, disabled && styles.disabled, pressed && styles.pressed]}>{family === 'material-community' ? <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} /> : family === 'feather' ? <Feather name={icon} size={iconSize} color={iconColor} /> : <Ionicons name={icon} size={iconSize} color={iconColor} />}</Pressable>;
}

export function Recessed({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <View style={[styles.recessed, style]}><LinearGradient pointerEvents="none" colors={theme.gradients.recessed} style={styles.recessedFill} />{children}</View>;
}

const createStyles = (theme: Theme) => ({
  panel: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.panel, borderWidth: theme.size.border, borderColor: theme.colors.border, boxShadow: theme.shadows.panel },
  button: { borderRadius: theme.radius.pill, flexShrink: 0 },
  iconButton: { alignItems: 'center' as const, justifyContent: 'center' as const, flexShrink: 0, borderRadius: theme.radius.pill },
  buttonFill: { flex: 1, borderRadius: theme.radius.pill, alignItems: 'center' as const, justifyContent: 'center' as const },
  disabled: { opacity: theme.opacity.disabled },
  pressed: { opacity: theme.opacity.pressed },
  recessed: { borderRadius: theme.radius.card, backgroundColor: theme.colors.recessed, boxShadow: theme.shadows.inset },
  recessedFill: { position: 'absolute' as const, top: 0, right: 0, bottom: 0, left: 0, borderRadius: theme.radius.card },
});
