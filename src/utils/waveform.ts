export function samplePeaks(channels: readonly { frames: readonly number[] }[], bars: number): number[] {
  return Array.from({ length: bars }, (_, index) => {
    let energy = 0, count = 0;
    for (const { frames } of channels) {
      const start = Math.floor(index * frames.length / bars);
      const end = Math.floor((index + 1) * frames.length / bars);
      for (let frame = start; frame < end; frame++) {
        if (!Number.isFinite(frames[frame])) continue;
        energy += frames[frame] ** 2; count++;
      }
    }
    return count ? Math.min(1, Math.sqrt(energy / count) * 3) : 0;
  });
}

// Separate outward rays let round SVG dashes form evenly spaced columns of dots.
export function radialDottedPath(amplitudes: readonly number[], center: number, radius: number, minLength: number, maxLength: number): string {
  'worklet';
  return amplitudes.map((sample, index) => {
    const angle = index / amplitudes.length * Math.PI * 2;
    const energy = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0;
    const outerRadius = radius + minLength + energy * (maxLength - minLength);
    const x = Math.sin(angle), y = -Math.cos(angle);
    return `M ${center + x * radius} ${center + y * radius} L ${center + x * outerRadius} ${center + y * outerRadius}`;
  }).join(' ');
}
