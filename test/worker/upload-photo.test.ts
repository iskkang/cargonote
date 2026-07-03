import { uploadSlotPhoto, type UploadSlotDeps } from '../../src/worker/uploadPhoto';
import type { NewPhoto } from '../../src/admin/repo';

function deps(over: Partial<UploadSlotDeps> = {}): { deps: UploadSlotDeps; uploads: any[]; inserted: NewPhoto[] } {
  const uploads: any[] = [];
  const inserted: NewPhoto[] = [];
  const d: UploadSlotDeps = {
    makeVariants: async () => ({ display: new Blob(['dddd']), thumb: new Blob(['t']) }),
    sha256Hex: async () => 'hash1',
    storage: { async upload(path, _body, opts) { uploads.push({ path, opts }); return { error: null }; } },
    insertPhoto: async (p) => { inserted.push(p); },
    now: () => '2026-07-02T00:00:00Z',
    ...over,
  };
  return { deps: d, uploads, inserted };
}

test('uploads display + thumb to slot paths and inserts a photo row', async () => {
  const { deps: d, uploads, inserted } = deps();
  const res = await uploadSlotPhoto(new Blob(['orig']), { slotKey: 'seal', containerId: 'ctn-1' }, d);
  expect(res).toEqual({
    displayPath: 'containers/ctn-1/seal-hash1.webp',
    thumbPath: 'containers/ctn-1/seal-hash1-thumb.webp',
    hash: 'hash1',
  });
  expect(uploads.map((u) => u.path)).toEqual([
    'containers/ctn-1/seal-hash1.webp',
    'containers/ctn-1/seal-hash1-thumb.webp',
  ]);
  expect(uploads[0].opts).toEqual({ contentType: 'image/webp', upsert: false });
  expect(inserted).toHaveLength(1);
  expect(inserted[0]).toMatchObject({
    containerId: 'ctn-1', slotKey: 'seal', fileHash: 'hash1',
    displayPath: 'containers/ctn-1/seal-hash1.webp', capturedAt: '2026-07-02T00:00:00Z',
  });
  expect(inserted[0].byteSize).toBeGreaterThan(0);
});

test('throws and does not insert when display upload fails', async () => {
  const { deps: d, inserted } = deps({ storage: { async upload() { return { error: { message: 'up-fail' } }; } } });
  await expect(uploadSlotPhoto(new Blob(['o']), { slotKey: 'empty', containerId: 'k' }, d)).rejects.toThrow('up-fail');
  expect(inserted).toHaveLength(0);
});

test('throws when thumb upload fails (after display ok)', async () => {
  let n = 0;
  const { deps: d, inserted } = deps({
    storage: { async upload() { n += 1; return n === 1 ? { error: null } : { error: { message: 'thumb-fail' } }; } },
  });
  await expect(uploadSlotPhoto(new Blob(['o']), { slotKey: 'empty', containerId: 'k' }, d)).rejects.toThrow('thumb-fail');
  expect(inserted).toHaveLength(0);
});
