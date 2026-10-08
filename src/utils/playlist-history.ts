export function mergePlaylistHistory(recent: readonly string[], saved: readonly string[]): string[] {
  return [...new Set([...recent, ...saved])].slice(0, 30);
}

export function parsePlaylistHistory(value: string | null): string[] {
  if (!value) return [];
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) ? mergePlaylistHistory(ids.filter((id): id is string => typeof id === 'string' && !!id), []) : [];
  } catch { return []; }
}
