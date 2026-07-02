import { createInMemoryWorkerClient, createSupabaseWorkerClient } from '../../src/worker/workerClient';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('in-memory client bootstraps the demo token and round-trips a photo', async () => {
  const repo = createInMemoryAdminRepo();
  const client = createInMemoryWorkerClient(repo);
  const b = await client.bootstrap('demotoken123');
  expect(b).not.toBeNull();
  expect(b!.template.route).toBe('TCR');
  const containerId = b!.containers[0].id;
  await client.insertPhoto('demotoken123', {
    containerId, slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp',
    fileHash: 'h', byteSize: 10, capturedAt: '2026-07-02T00:00:00Z',
  });
  const photos = await client.listPhotos('demotoken123', containerId);
  expect(photos.map((p) => p.slotKey)).toEqual(['seal']);
});

test('in-memory client returns null for an unknown token', async () => {
  const client = createInMemoryWorkerClient(createInMemoryAdminRepo());
  expect(await client.bootstrap('nope')).toBeNull();
});

test('supabase client maps worker_bootstrap jsonb via a fake rpc', async () => {
  const rpc = async (name: string) => {
    if (name === 'worker_bootstrap') {
      return { data: {
        order: { id: 'wo1', customer_id: 'c1', template_id: 't1', work_date: null, status: 'sent', assignee_name: null, assignee_contact: null, shipper_label: null },
        template: { id: 't1', name: 'T', carrier: 'FESCO', route: 'TSR', anchor_type: 'container_no', min_count: 8, warning_text: null, rules: {}, required_photos: [] },
        containers: [{ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }],
      }, error: null };
    }
    return { data: null, error: null };
  };
  const client = createSupabaseWorkerClient(rpc as any);
  const b = await client.bootstrap('GOODTOK');
  expect(b!.order.id).toBe('wo1');
  expect(b!.template.route).toBe('TSR');
  expect(b!.containers[0].containerNo).toBe('ABCD1234567');
});

test('supabase client throws on rpc error', async () => {
  const rpc = async () => ({ data: null, error: { message: 'denied' } });
  const client = createSupabaseWorkerClient(rpc as any);
  await expect(client.bootstrap('x')).rejects.toThrow('denied');
});
