import assert from 'node:assert/strict';
import test from 'node:test';

import { activeLyricIndex, parseLrc } from '../src/utils/lyrics.ts';
import { formatTime, nextTrack } from '../src/utils/playback.ts';

test('LRC handles offsets, repeated timestamps, fractions and word stamps', () => {
  assert.deepEqual(parseLrc('[ar:Example]\n[offset:-500]\n[00:02.25][00:04.250]A <00:02.30>quiet road\n[00:01.5]First\n[00:04.250]A quiet road\n[00:60.0]Invalid'), [
    { time: 1, text: 'First' }, { time: 1.75, text: 'A quiet road' }, { time: 3.75, text: 'A quiet road' },
  ]);
});

test('lyrics follow boundaries, instrumental gaps and backward seeks', () => {
  const lines = parseLrc('[00:02]First\n[00:06]Second\n[00:09]\n[00:12]Third');
  assert.equal(activeLyricIndex(lines, 1), -1);
  assert.equal(activeLyricIndex(lines, 6), 1);
  assert.equal(lines[activeLyricIndex(lines, 10)].text, '');
  assert.equal(activeLyricIndex(lines, 30), 3);
  assert.equal(activeLyricIndex(lines, 3), 0);
  assert.equal(activeLyricIndex([], 0), -1);
  assert.equal(activeLyricIndex(lines, NaN), -1);
});

const tracks = ['a', 'b', 'c'].map((id) => ({ id, title: id, artist: 'Example', uri: id, origin: 'local' }));
test('queue advances, stops at the end and wraps with repeat all', () => {
  assert.equal(nextTrack(tracks, 'a', false, 'off')?.id, 'b');
  assert.equal(nextTrack(tracks, 'c', false, 'off'), undefined);
  assert.equal(nextTrack(tracks, 'c', false, 'all')?.id, 'a');
  assert.equal(nextTrack([], null, false, 'all'), undefined);
  assert.equal(nextTrack(tracks, 'missing', true, 'all'), undefined);
});
test('shuffle never chooses the current song when alternatives exist', () => {
  assert.equal(nextTrack(tracks, 'b', true, 'off', () => 0)?.id, 'a');
  assert.equal(nextTrack(tracks, 'b', true, 'off', () => 0.99)?.id, 'c');
  assert.equal(nextTrack([tracks[0]], 'a', true, 'off'), undefined);
  assert.equal(nextTrack([tracks[0]], 'a', true, 'all')?.id, 'a');
});
test('display times are safe before audio metadata is ready', () => {
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(-4), '0:00');
  assert.equal(formatTime(125.9), '2:05');
});
