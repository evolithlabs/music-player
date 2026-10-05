import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeDeviceLibrary } from '../src/utils/device-library.ts';

const device = { id: 'device-1', deviceAssetId: 'content://audio/1', uri: 'content://audio/1', title: 'Song', artist: 'Artist', origin: 'local', addedAt: 1, fileState: 'available' };
const download = { id: 'saved', uri: 'saved.mp3', title: 'Saved', artist: 'Artist', origin: 'service', addedAt: 2, fileState: 'available' };
test('device scanning updates file locations without duplicating songs or losing metadata', () => {
  const existing = [{ ...device, album: 'Album', artworkUri: 'cover.jpg', fileState: 'missing' }, download];
  const found = [{ ...device, uri: 'content://new/1' }, { ...device, uri: 'content://new/1' }];
  const merged = mergeDeviceLibrary(existing, found);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].uri, 'content://new/1');
  assert.equal(merged[0].album, 'Album');
  assert.equal(merged[0].artworkUri, 'cover.jpg');
  assert.equal(merged[0].fileState, 'available');
  assert.deepEqual(mergeDeviceLibrary(merged, found), merged);
});
test('missing device audio retains IDs and denied access never marks songs missing', () => {
  const existing = [device, download];
  assert.equal(mergeDeviceLibrary(existing, null), existing);
  const merged = mergeDeviceLibrary(existing, []);
  assert.equal(merged[0].id, device.id);
  assert.equal(merged[0].fileState, 'missing');
  assert.deepEqual(merged[1], download);
});
