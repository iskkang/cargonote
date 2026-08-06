import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('in-memory getViewerManifest returns the latest published manifest by token', async () => {
  const repo = createInMemoryAdminRepo();
  const { viewerToken } = await repo.publish('wo-2', { route: 'TCR', customer: '青島パートナー', date: '2026-07-02', containers: [] });
  const m = await repo.getViewerManifest(viewerToken);
  expect(m?.route).toBe('TCR');
  expect(await repo.getViewerManifest('nope')).toBeNull();
});
