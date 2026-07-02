import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('seeds the TSR and TCR templates', async () => {
  const repo = createInMemoryAdminRepo();
  const routes = (await repo.listTemplates()).map((t) => t.route).sort();
  expect(routes).toEqual(['TCR', 'TSR']);
});

test('seeds at least one customer and some work orders', async () => {
  const repo = createInMemoryAdminRepo();
  expect((await repo.listCustomers()).length).toBeGreaterThan(0);
  expect((await repo.listWorkOrders()).length).toBeGreaterThan(0);
});

test('createWorkOrder adds a sent order and returns a worker token', async () => {
  const repo = createInMemoryAdminRepo();
  const [cust] = await repo.listCustomers();
  const [tpl] = await repo.listTemplates();
  const before = (await repo.listWorkOrders()).length;
  const { order, workerToken } = await repo.createWorkOrder({
    customerId: cust.id, templateId: tpl.id, containerNos: ['TCLU1234567'],
    workDate: '2026-07-02', assigneeName: '홍길동', assigneeContact: '010',
  });
  expect(order.status).toBe('sent');
  expect(workerToken).toMatch(/^[A-Za-z0-9]+$/);
  expect((await repo.listWorkOrders()).length).toBe(before + 1);
});
