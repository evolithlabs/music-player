export type DirectSelection = { songId: string; selectedAt: number };
export const selectionWindow = 14 * 24 * 60 * 60 * 1000;

export function parseSelections(value: string | null, now = Date.now()): DirectSelection[] {
  try {
    const items: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(items) ? items.filter((item): item is DirectSelection => typeof item?.songId === 'string' && Number.isFinite(item?.selectedAt) && item.selectedAt >= now - selectionWindow && item.selectedAt <= now) : [];
  } catch { return []; }
}

export function rankQuickPicks(items: DirectSelection[], now = Date.now()): string[] {
  const counts = new Map<string, { count: number; latest: number }>();
  for (const item of items) {
    if (item.selectedAt < now - selectionWindow || item.selectedAt > now) continue;
    const previous = counts.get(item.songId);
    counts.set(item.songId, { count: (previous?.count ?? 0) + 1, latest: Math.max(previous?.latest ?? 0, item.selectedAt) });
  }
  return [...counts].sort((a, b) => b[1].count - a[1].count || b[1].latest - a[1].latest).map(([id]) => id);
}
