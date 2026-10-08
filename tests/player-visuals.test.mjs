import assert from 'node:assert/strict';
import test from 'node:test';

import { radialAmplitudes, radialDottedPath, samplePeaks, squareDottedPath, timelineWaveformPath } from '../src/utils/waveform.ts';
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

test('loud audio retains differences instead of saturating at moderate volume', () => {
  const levels = [0.35, 0.5, 0.7, 0.9].map((level) => samplePeaks([{ frames: [level, -level] }], 1)[0]);
  levels.slice(1).forEach((level, index) => assert.ok(level > levels[index]));
  const responses = levels.map((level) => Math.max(...radialAmplitudes(Array(96).fill(level))));
  responses.slice(1).forEach((response, index) => assert.ok(response > responses[index]));
});

test('radial audio creates unequal spikes on different sides and stays silent without audio', () => {
  const amplitudes = radialAmplitudes(Array(96).fill(0.7));
  assert.ok(Math.max(...amplitudes) > Math.min(...amplitudes) * 2);
  assert.ok(amplitudes.every((value) => value >= 0 && value <= 1));
  assert.notDeepEqual(amplitudes, radialAmplitudes(Array(96).fill(0.9)));
  assert.deepEqual(radialAmplitudes([0, NaN, Infinity, -1]), [0, 0, 0, 0]);
  assert.deepEqual(radialAmplitudes([]), []);
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

test('square waveform follows all four edges and keeps outward dots within the halo', () => {
  const amplitudes = [0, 0.5, 1, NaN, Infinity, -1, 2, 0.5];
  const path = squareDottedPath(amplitudes, 150, 100, 4, 40);
  const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  const expectedLengths = [4, 22, 40, 4, 4, 4, 40, 22];
  amplitudes.forEach((_, index) => {
    const [x1, y1, x2, y2] = numbers.slice(index * 4, index * 4 + 4);
    assert.equal(Math.max(Math.abs(x1 - 150), Math.abs(y1 - 150)), 100);
    assert.equal(Math.hypot(x2 - x1, y2 - y1), expectedLengths[index]);
    assert.equal(Math.max(Math.abs(x2 - 150), Math.abs(y2 - 150)), 100 + expectedLengths[index]);
    assert.ok(x2 >= 10 && x2 <= 290 && y2 >= 10 && y2 <= 290);
  });
  assert.equal(squareDottedPath([], 150, 100, 4, 40), '');
});

test('timeline bars rise from the seek line, taper at its edges, and stay inside its bounds', () => {
  const path = timelineWaveformPath(Array(9).fill(1), 300, 34, 9);
  const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  const heights = [];
  for (let index = 0; index < 9; index++) {
    const [x1, y1, x2, y2] = numbers.slice(index * 4, index * 4 + 4);
    assert.equal(x1, x2);
    assert.equal(y1, 34);
    assert.ok(x1 > 0 && x1 < 300 && y2 >= 0 && y2 <= 34);
    heights.push(y1 - y2);
  }
  assert.ok(heights[4] > heights[0] * 3 && heights[4] > heights[8] * 3);
  assert.equal(heights[4], 34);
});

test('timeline waveform handles silence, invalid samples, resizing and varying audio energy', () => {
  const coordinates = (samples) => timelineWaveformPath(samples, 300, 34, 1).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  for (const sample of [0, -1, NaN, Infinity]) assert.deepEqual(coordinates([sample]), [150, 34, 150, 34]);
  const levels = [0.1, 0.35, 0.7, 1].map((level) => 34 - coordinates([level])[3]);
  levels.slice(1).forEach((level, index) => assert.ok(level > levels[index]));
  assert.equal(timelineWaveformPath([], 300, 34, 60), '');
  assert.equal(timelineWaveformPath([1], 0, 34, 60), '');
  assert.equal(timelineWaveformPath([1], 300, 34, 0), '');
  assert.equal(timelineWaveformPath([1], NaN, 34, 60), '');
  assert.equal((timelineWaveformPath([1], 180, 34, 30).match(/M /g) ?? []).length, 30);
});
