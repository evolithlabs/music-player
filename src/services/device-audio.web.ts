import type { Track } from '../types/music';

export async function scanDeviceAudio(_requestAccess = false): Promise<Track[] | null> { return null; }
export function watchDeviceAudio(_onChange: () => void) { return () => {}; }
