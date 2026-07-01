// @vitest-environment node
import { beforeEach } from 'vitest';
import { deleteDB } from 'idb';
import { enqueue, pendingItems, markUploaded, hasHash, allItems } from '../src/lib/captureQueue';
import type { CaptureItem } from '../src/lib/types';

function item(hash: string): CaptureItem {
  return { id: hash, hash, slotKey: 'seal', blob: new Blob(['x']), capturedAt: 1, gps: null, status: 'pending' };
}

beforeEach(async () => { await deleteDB('cargolink-capture'); });

test('enqueue adds a pending item', async () => {
  expect(await enqueue(item('aaa'))).toBe('added');
  const pending = await pendingItems();
  expect(pending.map((i) => i.hash)).toEqual(['aaa']);
});

test('enqueue is idempotent by hash', async () => {
  await enqueue(item('aaa'));
  expect(await enqueue(item('aaa'))).toBe('duplicate');
  expect(await hasHash('aaa')).toBe(true);
  expect(await allItems()).toHaveLength(1);
});

test('markUploaded removes item from pending', async () => {
  await enqueue(item('bbb'));
  await markUploaded('bbb');
  expect(await pendingItems()).toHaveLength(0);
  expect((await allItems())[0].status).toBe('uploaded');
});
