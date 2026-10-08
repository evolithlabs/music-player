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
    return count ? Math.min(1, Math.sqrt(energy / count)) : 0;
  });
}

export function radialAmplitudes(samples: readonly number[]): number[] {
  'worklet';
  const energies = samples.map((sample) => Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0);
  const level = energies.reduce((total, energy) => total + energy, 0) / Math.max(1, energies.length);
  return energies.map((energy, index) => {
    const angle = index / energies.length * Math.PI * 2;
    // Soft gain keeps loud samples distinct instead of flattening them at one.
    const response = Math.pow(energy * 6 / (1 + energy * 5), 1.2);
    // Uneven lobes and narrower tips move with the audio's overall energy.
    const lobe = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(angle * 3 + level * 5), 2);
    const tip = 0.65 + 0.35 * Math.pow(0.5 + 0.5 * Math.sin(angle * 11 - level * 3), 6);
    return response * lobe * tip;
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

export function squareDottedPath(amplitudes: readonly number[], center: number, halfSize: number, minLength: number, maxLength: number): string {
  'worklet';
  return amplitudes.map((sample, index) => {
    const position = (index + 0.5) / amplitudes.length * 4;
    const side = Math.floor(position);
    const offset = ((position - side) * 2 - 1) * halfSize;
    const energy = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0;
    const length = minLength + energy * (maxLength - minLength);
    const x = side === 0 ? offset : side === 1 ? halfSize : side === 2 ? -offset : -halfSize;
    const y = side === 0 ? -halfSize : side === 1 ? offset : side === 2 ? halfSize : -offset;
    const dx = side === 1 ? length : side === 3 ? -length : 0;
    const dy = side === 0 ? -length : side === 2 ? length : 0;
    return `M ${center + x} ${center + y} L ${center + x + dx} ${center + y + dy}`;
  }).join(' ');
}

export function timelineWaveformPath(samples: readonly number[], width: number, height: number, bars: number): string {
  'worklet';
  if (!samples.length || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(bars) || width <= 0 || height <= 0 || bars < 1) return '';
  const count = Math.floor(bars);
  return Array.from({ length: count }, (_, index) => {
    const sample = samples[Math.min(samples.length - 1, Math.floor(index / Math.max(1, count - 1) * (samples.length - 1)))];
    const energy = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0;
    const position = (index + 1) / (count + 1);
    const response = energy * 4 / (1 + energy * 3);
    // Taper the ends so the time labels stay clear of the tallest bars.
    const envelope = Math.pow(Math.sin(position * Math.PI), 1.5);
    const x = position * width;
    return `M ${x} ${height} L ${x} ${height - response * envelope * height}`;
  }).join(' ');
}
