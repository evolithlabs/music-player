import { TextStyle } from 'react-native';

type Gradient = readonly [string, string, ...string[]];

export type Theme = {
  id: string;
  name: string;
  description: string;
  dark: boolean;
  colors: {
    background: string; surface: string; recessed: string; border: string;
    text: string; muted: string; accent: string; onAccent: string;
    error: string; progress: string; overlay: string; transparent: string; subtle: string; highlight: string;
  };
  gradients: { canvas: Gradient; panel: Gradient; control: Gradient; accent: Gradient; recessed: Gradient; progress: Gradient; artwork: Gradient; emptyOverlay: Gradient };
  shadows: { panel: string; raised: string; inset: string; artwork: string; accent: string };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; section: number };
  layout: { outerInset: number; contentInset: number };
  radius: { panel: number; card: number; input: number; dock: number; artwork: number; pill: number };
  type: { eyebrow: TextStyle; heading: TextStyle; title: TextStyle; body: TextStyle; caption: TextStyle; time: TextStyle; action: TextStyle };
  size: { panelWidth: number; panelHeight: number; wideBreakpoint: number; artwork: number; albumArtwork: number; thumbnail: number; control: number; play: number; smallControl: number; trackControl: number; icon: number; smallIcon: number; track: number; tabBar: number; border: number; progress: number; thumb: number };
  opacity: { disabled: number; pressed: number; placeholder: number };
  dock: { player: Gradient; navigationGradient: Gradient; edge: string; navigationShadow: string; text: string; muted: string; maxWidth: number; waveformHeight: number; waveformBars: number; lyricHeight: number };
};

// Structural decisions are tokens too: themes can change type, shape, spacing,
// depth, and gradients without editing a screen or component.
const foundation: Pick<Theme, 'space' | 'layout' | 'radius' | 'type' | 'size' | 'opacity'> = {
  space: { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, xxl: 40, section: 48 },
  layout: { outerInset: 8, contentInset: 16 },
  radius: { panel: 48, card: 18, input: 16, dock: 24, artwork: 999, pill: 999 },
  type: {
    eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
    heading: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
    title: { fontSize: 20, fontWeight: '600', letterSpacing: -0.4 },
    body: { fontSize: 15, lineHeight: 22 },
    caption: { fontSize: 13, lineHeight: 18 },
    time: { fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
    action: { fontSize: 14, fontWeight: '500' },
  },
  size: { panelWidth: 374, panelHeight: 808, wideBreakpoint: 840, artwork: 282, albumArtwork: 144, thumbnail: 54, control: 68, play: 80, smallControl: 44, trackControl: 36, icon: 22, smallIcon: 18, track: 64, tabBar: 64, border: 1, progress: 6, thumb: 30 },
  opacity: { disabled: 0.35, pressed: 0.7, placeholder: 0.5 },
};

const charcoal: Theme = {
  ...foundation,
  dock: { player: ['#000000', '#000000'], navigationGradient: ['#121617', '#121617'], edge: '#41484A80', navigationShadow: 'none', text: '#F3F2EE', muted: '#A1A8AA', maxWidth: 560, waveformHeight: 34, waveformBars: 96, lyricHeight: 132 },
  id: 'charcoal', name: 'Matte charcoal', description: 'Flat charcoal surfaces. Ember orange accents.', dark: true,
  colors: { background: '#121617', surface: '#222729', recessed: '#111416', border: '#FFFFFF10', text: '#F0F0EC', muted: '#979F9F', accent: '#FF742E', onAccent: '#FFF8F1', error: '#F0A59B', progress: '#EAB94A', overlay: '#080B0D33', transparent: 'transparent', subtle: '#292F31', highlight: '#FFFFFF0D' },
  gradients: { canvas: ['#121617', '#121617'], panel: ['#222729', '#222729'], control: ['#222729', '#222729'], accent: ['#FF742E', '#FF742E'], recessed: ['#111416', '#111416'], progress: ['#FF742E', '#FF742E'], artwork: ['#222729', '#222729'], emptyOverlay: ['#13171900', '#131719B8', '#131719CC', '#13171900'] },
  shadows: {
    panel: 'none', raised: 'none', inset: 'none', artwork: 'none', accent: 'none',
  },
};

export const themes: readonly Theme[] = [charcoal];
export const defaultTheme = charcoal;

export function findTheme(id: string | null) {
  return themes.find((theme) => theme.id === id) ?? defaultTheme;
}
