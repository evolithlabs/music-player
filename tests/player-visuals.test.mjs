import assert from 'node:assert/strict';
import test from 'node:test';

import { radialDottedPath, samplePeaks } from '../src/utils/waveform.ts';
import { pendingDownloadCount } from '../src/utils/downloads.ts';

test('waveform responds to real audio energy, including silence, stereo and invalid samples', () => {
  assert.deepEqual(samplePeaks([{ frames: [0, 0, 0, 0] }], 2), [0, 0]);
  assert.deepEqual(samplePeaks([{ frames: [1, -1, 0, 0] }], 2), [1, 0]);
  const quiet = samplePeaks([{ frames: [0.1, -0.1] }], 1)[0];
  const loud = samplePeaks([{ frames: [0.2, -0.2] }], 1)[0];
  assert.ok(loud > quiet);
  assert.ok(samplePeaks([{ frames: [0, 0] }, { frames: [1, -1] }], 1)[0] > 0);
  assert.deepEqual(samplePeaks([{ frames: [NaN, Infinity] }], 2), [0, 0]);
  assert.deepEqual(samplePeaks([], 3), [0, 0, 0]);
});

test('queue badge counts preparation and unfinished transfers, excluding saved and failed jobs', () => {
  const entries = ['queued', 'resolving', 'downloading', 'completed', 'failed'].map((status) => ({ transfer: 'pending', job: { status } }));
  assert.equal(pendingDownloadCount(entries), 4);
  assert.equal(pendingDownloadCount([{ transfer: 'saved', job: { status: 'completed' } }, { transfer: 'failed', job: { status: 'completed' } }]), 0);
  entries[3].transfer = 'saved';
  assert.equal(pendingDownloadCount(entries), 3);
});

test('dotted rays stay outside the artwork and grow with audio without exceeding their bounds', () => {
  const amplitudes = [0, 0.5, 1, NaN, Infinity, -1, 2];
  const path = radialDottedPath(amplitudes, 150, 100, 16, 40);
  assert.equal((path.match(/M /g) ?? []).length, amplitudes.length);
  assert.equal((path.match(/L /g) ?? []).length, amplitudes.length);
  assert.ok(!path.includes('NaN') && !path.includes('Infinity'));
  const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  const expectedLengths = [16, 28, 40, 16, 16, 16, 40];
  amplitudes.forEach((_, index) => {
    const [x1, y1, x2, y2] = numbers.slice(index * 4, index * 4 + 4);
    assert.ok(Math.abs(Math.hypot(x1 - 150, y1 - 150) - 100) < 1e-8);
    assert.ok(Math.abs(Math.hypot(x2 - x1, y2 - y1) - expectedLengths[index]) < 1e-8);
  });
  assert.equal(radialDottedPath([], 150, 100, 16, 40), '');
});
