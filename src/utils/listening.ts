export type ListeningSample = { position: number; sampledAt: number; playing: boolean };

// Seeking, resuming and buffering never add skipped audio to listening totals.
export function listenedSeconds(previous: ListeningSample | undefined, next: ListeningSample) {
  if (!previous?.playing || !next.playing) return 0;
  const elapsed = (next.sampledAt - previous.sampledAt) / 1000;
  const advanced = next.position - previous.position;
  return elapsed > 0 && advanced >= 0 && advanced <= elapsed + 0.75 ? Math.min(advanced, elapsed) : 0;
}
