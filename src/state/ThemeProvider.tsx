import { localPreferences } from '../database';
import * as SystemUI from 'expo-system-ui';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, Platform, StyleSheet } from 'react-native';

import { defaultTheme, findTheme, Theme, themes } from '../theme';

const storageKey = 'music-player.theme.v1';
const ThemeContext = createContext<{ theme: Theme; selectTheme: (id: string) => void; error: string | null } | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState(defaultTheme);
  const [error, setError] = useState<string | null>(null);
  const selected = useRef(false);
  const selectionVersion = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    localPreferences.getItem(storageKey).then((id) => {
      if (active && !selected.current) {
        const restored = findTheme(id);
        setTheme(restored);
        if (id && id !== restored.id) pending.current = pending.current.then(() => localPreferences.setItem(storageKey, restored.id)).catch(() => { if (active) setError('Could not save the current appearance.'); });
      }
    }).catch(() => { if (active && !selected.current) setError('Could not load your appearance preference.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(theme.dark ? 'dark' : 'light');
    // Rendered surfaces remain themed if the host cannot change its root backdrop.
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme]);

  const selectTheme = useCallback((id: string) => {
    const next = themes.find((item) => item.id === id);
    if (!next) return;
    selected.current = true;
    const version = ++selectionVersion.current;
    setTheme(next);
    setError(null);
    // Serialize writes so rapid changes cannot persist an older selection last.
    pending.current = pending.current.then(() => localPreferences.setItem(storageKey, id)).catch(() => {
      if (version === selectionVersion.current) setError('Your theme changed, but could not be saved. Please select it again to retry.');
    });
  }, []);

  const value = useMemo(() => ({ theme, selectTheme, error }), [theme, selectTheme, error]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is required');
  return value;
}

export function useThemeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}
