import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('resolves the seeded demo worker token to order + template + containers', async () => {
  const repo = createInMemoryAdminRepo();
  const r = await repo.getByWorkerToken('demotoken123');
  expect(r).not.toBeNull();
  expect(r!.template.route).toBe('TCR');
  expect(r!.containers.map((c) => c.containerNo)).toContain('FBLU4204812');
});

test('returns null for an unknown token', async () => {
  const repo = createInMemoryAdminRepo();
  expect(await repo.getByWorkerToken('nope')).toBeNull();
});

test('a token returned by createWorkOrder resolves back to that order', async () => {
  const repo = createInMemoryAdminRepo();
  const [cust] = await repo.listCustomers();
  const [tpl] = await repo.listTemplates();
  const { order, workerToken } = await repo.createWorkOrder({
    customerId: cust.id, templateId: tpl.id, containerNos: ['ABCD1234567'],
    workDate: null, assigneeName: 'A', assigneeContact: 'B',
  });
  const r = await repo.getByWorkerToken(workerToken);
  expect(r!.order.id).toBe(order.id);
  expect(r!.containers.map((c) => c.containerNo)).toEqual(['ABCD1234567']);
});
