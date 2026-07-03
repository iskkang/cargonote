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

test('createCustomer adds a customer with contact fields', async () => {
  const repo = createInMemoryAdminRepo();
  const before = (await repo.listCustomers()).length;
  const c = await repo.createCustomer({ name: '동방물류', contactName: '박담당', phone: '010-9', email: 'db@x.com' });
  expect(c.name).toBe('동방물류');
  expect(c.contactName).toBe('박담당');
  expect((await repo.listCustomers()).length).toBe(before + 1);
});

test('updateCustomer changes fields in place', async () => {
  const repo = createInMemoryAdminRepo();
  const c = await repo.createCustomer({ name: 'A', contactName: null, phone: null, email: null });
  const u = await repo.updateCustomer(c.id, { name: 'B', contactName: '이', phone: '02', email: 'b@x.com' });
  expect(u.name).toBe('B');
  expect((await repo.listCustomers()).find((x) => x.id === c.id)!.contactName).toBe('이');
});

test('deleteCustomer removes an unreferenced customer', async () => {
  const repo = createInMemoryAdminRepo();
  const c = await repo.createCustomer({ name: 'Temp', contactName: null, phone: null, email: null });
  await repo.deleteCustomer(c.id);
  expect((await repo.listCustomers()).find((x) => x.id === c.id)).toBeUndefined();
});

test('deleteCustomer throws when the customer has work orders', async () => {
  const repo = createInMemoryAdminRepo();
  const [order] = await repo.listWorkOrders();
  await expect(repo.deleteCustomer(order.customerId)).rejects.toThrow();
});

test('listWorkOrderSummaries returns route, customer, required + captured + damage counts', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'damage', displayPath: 'd2.webp', thumbPath: 't2.webp', fileHash: 'h2', byteSize: 1, capturedAt: '2026-07-02T02:00:00Z' });
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'damage', displayPath: 'd3.webp', thumbPath: 't3.webp', fileHash: 'h3', byteSize: 1, capturedAt: '2026-07-02T03:00:00Z' });
  const summaries = await repo.listWorkOrderSummaries();
  const wo2 = summaries.find((s) => s.order.id === 'wo-2')!;
  expect(wo2.customerName).toContain('칭다오');
  expect(wo2.route).toBe('TCR');
  expect(wo2.requiredCount).toBeGreaterThan(0);
  expect(wo2.capturedCount).toBe(1);   // damage does not inflate required capture count
  expect(wo2.damageCount).toBe(2);
});

test('deleteWorkOrder removes the order (and its containers)', async () => {
  const repo = createInMemoryAdminRepo();
  const before = (await repo.listWorkOrders()).length;
  await repo.deleteWorkOrder('wo-2');
  const after = await repo.listWorkOrders();
  expect(after.length).toBe(before - 1);
  expect(after.find((o) => o.id === 'wo-2')).toBeUndefined();
});

test('updateWorkOrder changes assignee and work date', async () => {
  const repo = createInMemoryAdminRepo();
  const u = await repo.updateWorkOrder('wo-2', { assigneeName: '새담당', assigneeContact: '010-9', workDate: '2026-08-01' });
  expect(u.assigneeName).toBe('새담당');
  expect((await repo.listWorkOrders()).find((o) => o.id === 'wo-2')!.workDate).toBe('2026-08-01');
});
