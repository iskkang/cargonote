import { createSupabaseAdminRepo } from '../../src/admin/supabaseRepo';
import type { DbPort, Row, Filter } from '../../src/admin/db';

// In-memory fake DbPort: tables keyed by name; insert assigns an id when missing.
function memPort(seed: Record<string, Row[]> = {}): DbPort {
  const tables: Record<string, Row[]> = { customers: [], work_type_templates: [], work_orders: [], containers: [], share_links: [], photos: [], ...seed };
  return {
    async select(table: string, filter?: Filter) {
      const rows = tables[table] ?? [];
      return filter ? rows.filter((r) => String(r[filter.col]) === filter.val) : [...rows];
    },
    async insert(table: string, values: Row | Row[]) {
      const arr = Array.isArray(values) ? values : [values];
      const inserted = arr.map((r, i) => ({ id: r.id ?? `${table}-${(tables[table]?.length ?? 0) + i}`, ...r }));
      tables[table] = [...(tables[table] ?? []), ...inserted];
      return inserted;
    },
    async update(table: string, match: Filter, values: Row) {
      tables[table] = (tables[table] ?? []).map((r) =>
        String(r[match.col]) === match.val ? { ...r, ...values } : r
      );
      return tables[table].filter((r) => String(r[match.col]) === match.val);
    },
  };
}

const tplRow: Row = {
  id: 'tpl-tcr', name: 'TCR', carrier: '중국세관', route: 'TCR', anchor_type: 'container_no',
  min_count: 8, warning_text: '반송 주의', rules: {}, required_photos: [{ key: 'seal', label: '씰', instruction: '', required: true }],
};

test('list methods map rows to domain', async () => {
  const db = memPort({
    customers: [{ id: 'c1', name: 'MTL', contact: null, notes: null }],
    work_type_templates: [tplRow],
    work_orders: [{ id: 'wo1', customer_id: 'c1', template_id: 'tpl-tcr', work_date: null, status: 'sent', assignee_name: 'A', assignee_contact: 'B', shipper_label: null }],
  });
  const repo = createSupabaseAdminRepo(db);
  expect((await repo.listCustomers())[0].name).toBe('MTL');
  expect((await repo.listTemplates())[0].route).toBe('TCR');
  expect((await repo.listWorkOrders())[0].id).toBe('wo1');
});

test('createWorkOrder inserts order + containers + worker share_link, token resolves back', async () => {
  const db = memPort({ work_type_templates: [tplRow], customers: [{ id: 'c1', name: 'MTL', contact: null, notes: null }] });
  const repo = createSupabaseAdminRepo(db);
  const { order, workerToken } = await repo.createWorkOrder({
    customerId: 'c1', templateId: 'tpl-tcr', containerNos: ['ABCD1234567'],
    workDate: null, assigneeName: '박', assigneeContact: '010',
  });
  expect(order.status).toBe('sent');
  expect(workerToken).toMatch(/^[A-Za-z0-9]+$/);
  const r = await repo.getByWorkerToken(workerToken);
  expect(r).not.toBeNull();
  expect(r!.order.id).toBe(order.id);
  expect(r!.template.route).toBe('TCR');
  expect(r!.containers.map((c) => c.containerNo)).toEqual(['ABCD1234567']);
});

test('getByWorkerToken returns null for unknown and revoked tokens', async () => {
  const db = memPort({
    share_links: [{ id: 's1', work_order_id: 'wo1', token: 'revoked-tok', kind: 'worker', revoked: true }],
  });
  const repo = createSupabaseAdminRepo(db);
  expect(await repo.getByWorkerToken('nope')).toBeNull();
  expect(await repo.getByWorkerToken('revoked-tok')).toBeNull();
});

test('insertPhoto then listPhotos round-trips through the port', async () => {
  const db = memPort();
  const repo = createSupabaseAdminRepo(db);
  await repo.insertPhoto({ containerId: 'k1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 5, capturedAt: '2026-07-02T00:00:00Z' });
  const list = await repo.listPhotos('k1');
  expect(list.map((p) => p.slotKey)).toEqual(['seal']);
  expect(list[0].displayPath).toBe('d.webp');
});
