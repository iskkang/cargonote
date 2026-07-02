import { createInMemoryAdminRepo } from '../../src/admin/repo';

async function seeded() {
  const repo = createInMemoryAdminRepo();
  // ctn-1 belongs to wo-2 (TCR). Add two photos for the same slot + one other slot.
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd1.webp', thumbPath: 't1.webp', fileHash: 'h1', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd2.webp', thumbPath: 't2.webp', fileHash: 'h2', byteSize: 1, capturedAt: '2026-07-02T03:00:00Z' });
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'empty', displayPath: 'd3.webp', thumbPath: 't3.webp', fileHash: 'h3', byteSize: 1, capturedAt: '2026-07-02T02:00:00Z' });
  return repo;
}

test('getWorkOrderReview returns containers with latest-per-slot photos + customer/template', async () => {
  const repo = await seeded();
  const r = await repo.getWorkOrderReview('wo-2');
  expect(r).not.toBeNull();
  expect(r!.template.route).toBe('TCR');
  expect(r!.customer?.name).toContain('칭다오');
  expect(r!.containers).toHaveLength(1);
  const photos = r!.containers[0].photos;
  // seal deduped to the latest (h2), plus empty (h3)
  expect(photos.map((p) => p.fileHash).sort()).toEqual(['h2', 'h3']);
});

test('getWorkOrderReview returns null for an unknown id', async () => {
  const repo = createInMemoryAdminRepo();
  expect(await repo.getWorkOrderReview('nope')).toBeNull();
});

test('publish sets status=published and returns a viewer token, reused on re-publish', async () => {
  const repo = await seeded();
  const manifest = { route: 'TCR', customer: '칭다오 파트너', containers: [] };
  const { viewerToken } = await repo.publish('wo-2', manifest);
  expect(viewerToken).toMatch(/^[A-Za-z0-9]+$/);
  const order = (await repo.listWorkOrders()).find((o) => o.id === 'wo-2');
  expect(order!.status).toBe('published');
  const again = await repo.publish('wo-2', manifest);
  expect(again.viewerToken).toBe(viewerToken);
});
