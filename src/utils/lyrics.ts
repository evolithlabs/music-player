export type LyricLine = { time: number; text: string };

export function parseLrc(source: string): LyricLine[] {
  const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  const lines: LyricLine[] = [];
  for (const row of source.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    // Enhanced-LRC word stamps are unnecessary for the three-line snippet.
    const text = row.replace(/\[[^\]]*\]/g, '').replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
    for (const stamp of stamps) {
      if (Number(stamp[2]) >= 60) continue;
      const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0;
      lines.push({ time: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + fraction + offset), text });
    }
  }
  return lines.sort((a, b) => a.time - b.time).filter((line, index, all) => index === 0 || line.time !== all[index - 1].time || line.text !== all[index - 1].text);
}

export function activeLyricIndex(lines: readonly LyricLine[], seconds: number): number {
  if (!Number.isFinite(seconds)) return -1;
  let low = 0;
  let high = lines.length - 1;
  let active = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle].time <= seconds) { active = middle; low = middle + 1; }
    else high = middle - 1;
  }
  return active;
}
