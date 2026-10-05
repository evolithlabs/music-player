import assert from 'node:assert/strict';
import test from 'node:test';

import { groupTracks, rememberTrack } from '../src/utils/collections.ts';
import { sleepTimerExpired } from '../src/utils/sleep.ts';

const tracks = [
  { id: 'one', title: 'One', artist: 'A', album: 'Shared title' },
  { id: 'two', title: 'Two', artist: 'B', album: 'Shared title' },
  { id: 'three', title: 'Three', artist: 'A' },
];
test('albums with the same name keep each artist’s collection separate', () => {
  const albums = groupTracks(tracks, 'album');
  assert.equal(albums.length, 2);
  assert.deepEqual(albums.map((group) => group.tracks.map((track) => track.id)), [['one'], ['two']]);
});
test('artists include songs without album metadata', () => {
  assert.deepEqual(groupTracks(tracks, 'artist')[0].tracks.map((track) => track.id), ['one', 'three']);
});
test('recently played moves a song to the front without duplicate cards', () => {
  assert.deepEqual(rememberTrack(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
  assert.deepEqual(rememberTrack(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
});
test('sleep timer uses an absolute deadline, including after app suspension', () => {
  assert.equal(sleepTimerExpired({ mode: 'time', deadline: 1000, minutes: 10 }, 999), false);
  assert.equal(sleepTimerExpired({ mode: 'time', deadline: 1000, minutes: 10 }, 1000), true);
  assert.equal(sleepTimerExpired({ mode: 'time', deadline: 1000, minutes: 10 }, 5000), true);
  assert.equal(sleepTimerExpired({ mode: 'off' }, 5000), false);
  assert.equal(sleepTimerExpired({ mode: 'end' }, 5000), false);
});
