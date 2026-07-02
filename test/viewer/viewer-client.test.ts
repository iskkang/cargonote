import { createInMemoryViewerClient, createSupabaseViewerClient } from '../../src/viewer/viewerClient';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('in-memory viewer client returns the published manifest for its token', async () => {
  const repo = createInMemoryAdminRepo();
  const { viewerToken } = await repo.publish('wo-2', { route: 'TCR', customer: '칭다오 파트너', containers: [] });
  const client = createInMemoryViewerClient(repo);
  expect((await client.bootstrap(viewerToken))?.route).toBe('TCR');
  expect(await client.bootstrap('nope')).toBeNull();
});

test('supabase viewer client returns rpc data and null when absent', async () => {
  const ok = createSupabaseViewerClient((async () => ({ data: { route: 'TSR', customer: null, containers: [] }, error: null })) as any);
  expect((await ok.bootstrap('t'))?.route).toBe('TSR');
  const none = createSupabaseViewerClient((async () => ({ data: null, error: null })) as any);
  expect(await none.bootstrap('t')).toBeNull();
});

test('supabase viewer client throws on rpc error', async () => {
  const bad = createSupabaseViewerClient((async () => ({ data: null, error: { message: 'denied' } })) as any);
  await expect(bad.bootstrap('t')).rejects.toThrow('denied');
});
