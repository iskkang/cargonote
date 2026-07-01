import { uploadCapture, type StorageLike } from '../src/lib/uploader';
import type { CaptureItem } from '../src/lib/types';

const item: CaptureItem = { id: 'h1', hash: 'h1', slotKey: null, blob: new Blob(['x']), capturedAt: 1, gps: null, status: 'pending' };

test('uploads to spike/{hash}.webp with upsert and returns path', async () => {
  const calls: any[] = [];
  const storage: StorageLike = { async upload(path, body, opts) { calls.push({ path, opts }); return { error: null }; } };
  const path = await uploadCapture(item, storage);
  expect(path).toBe('spike/h1.webp');
  expect(calls[0]).toEqual({ path: 'spike/h1.webp', opts: { contentType: 'image/webp', upsert: true } });
});

test('throws on storage error', async () => {
  const storage: StorageLike = { async upload() { return { error: { message: 'nope' } }; } };
  await expect(uploadCapture(item, storage)).rejects.toThrow('nope');
});
