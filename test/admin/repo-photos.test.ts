import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('insertPhoto then listPhotos returns it for that container only', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({
    containerId: 'ctn-1', slotKey: 'seal', displayPath: 'containers/ctn-1/seal-h.webp',
    thumbPath: 'containers/ctn-1/seal-h-thumb.webp', fileHash: 'h', byteSize: 10, capturedAt: '2026-07-02T00:00:00Z',
  });
  const mine = await repo.listPhotos('ctn-1');
  expect(mine.map((p) => p.slotKey)).toEqual(['seal']);
  expect(mine[0].displayPath).toBe('containers/ctn-1/seal-h.webp');
  expect(mine[0].status).toBe('uploaded');
  expect(await repo.listPhotos('ctn-other')).toEqual([]);
});
