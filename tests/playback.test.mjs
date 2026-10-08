import assert from 'node:assert/strict';
import test from 'node:test';

import { activeLyricIndex, parseLrc } from '../src/utils/lyrics.ts';
import { formatSongArtist, formatTime, nextTrack, seekTime, upcomingTracks } from '../src/utils/playback.ts';

test('scrubbing seeks left and right, clamps beyond track edges and rejects unavailable geometry', () => {
  assert.equal(seekTime(75, 300, 240), 60);
  assert.equal(seekTime(225, 300, 240), 180);
  assert.equal(seekTime(-50, 300, 240), 0);
  assert.equal(seekTime(350, 300, 240), 240);
  for (const [position, width, duration] of [[NaN, 300, 240], [Infinity, 300, 240], [10, 0, 240], [10, NaN, 240], [10, 300, 0], [10, 300, -1], [10, 300, Infinity]]) {
    assert.equal(seekTime(position, width, duration), undefined);
  }
});

test('song subtitles format millisecond durations consistently and prefer measured playback duration', () => {
  const song = { artist: 'Artist', durationMs: 195000 };
  assert.equal(formatSongArtist(song), 'Artist • 3:15');
  assert.equal(formatSongArtist({ ...song, durationMs: 9000 }), 'Artist • 0:09');
  assert.equal(formatSongArtist(song, 201.9), 'Artist • 3:21');
  assert.equal(formatSongArtist(song, NaN), 'Artist • 3:15');
  for (const durationMs of [undefined, 0, -1, NaN, Infinity]) {
    assert.equal(formatSongArtist({ artist: 'Artist', durationMs }), 'Artist');
  }
});

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
test('upcoming songs follow the current collection and wrap only for repeat all', () => {
  const ids = (queue) => queue.map((track) => track.id);
  assert.deepEqual(ids(upcomingTracks(tracks, 'a', false, 'off')), ['b', 'c']);
  assert.deepEqual(ids(upcomingTracks(tracks, 'b', false, 'all')), ['c', 'a']);
  assert.deepEqual(ids(upcomingTracks(tracks, 'c', false, 'off')), []);
  assert.deepEqual(ids(upcomingTracks(tracks, 'b', false, 'one')), ['c']);
  assert.deepEqual(ids(upcomingTracks([tracks[0], { ...tracks[1], fileState: 'missing' }, tracks[2]], 'a', false, 'off')), ['c']);
  assert.deepEqual(upcomingTracks(tracks, null, false, 'all'), []);
  assert.deepEqual(upcomingTracks(tracks, 'missing', true, 'all'), []);
});
test('shuffle queue lists eligible songs without changing collection order', () => {
  assert.deepEqual(upcomingTracks(tracks, 'b', true, 'off').map((track) => track.id), ['a', 'c']);
  assert.deepEqual(tracks.map((track) => track.id), ['a', 'b', 'c']);
});
test('display times are safe before audio metadata is ready', () => {
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(-4), '0:00');
  assert.equal(formatTime(125.9), '2:05');
});
