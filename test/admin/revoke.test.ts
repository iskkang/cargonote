import { createInMemoryAdminRepo } from '../../src/admin/repo';
import type { ViewerManifest } from '../../src/domain/viewer';

const manifest: ViewerManifest = { route: 'TCR', customer: '칭다오 파트너', date: '2026-07-02', containers: [] };

test('revoke invalidates the viewer link; republish restores it', async () => {
  const repo = createInMemoryAdminRepo();
  const { viewerToken } = await repo.publish('wo-2', manifest);
  expect(await repo.getViewerToken('wo-2')).toBe(viewerToken);
  expect(await repo.getViewerManifest(viewerToken)).not.toBeNull();

  await repo.revokePublication('wo-2');
  expect(await repo.getViewerToken('wo-2')).toBeNull();
  expect(await repo.getViewerManifest(viewerToken)).toBeNull();

  const again = await repo.publish('wo-2', manifest);
  expect(again.viewerToken).toBe(viewerToken); // stable token
  expect(await repo.getViewerToken('wo-2')).toBe(viewerToken);
  expect(await repo.getViewerManifest(viewerToken)).not.toBeNull();
});
