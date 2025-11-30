import type { CapacitorMusicControls } from 'capacitor-music-controls-plugin';

export type MediaControlOptions = Parameters<typeof CapacitorMusicControls.create>[0];

export type MediaControlsEvent = Event & { message: string; position: number };
