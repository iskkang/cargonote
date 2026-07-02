import { createSupabaseAdminRepo } from '../../src/admin/supabaseRepo';
import type { DbPort, Row, Filter } from '../../src/admin/db';

function memPort(seed: Record<string, Row[]> = {}): DbPort {
  const tables: Record<string, Row[]> = { customers: [], work_type_templates: [], work_orders: [], containers: [], share_links: [], photos: [], publications: [], ...seed };
  const match = (r: Row, f: Filter) => String(r[f.col]) === f.val;
  return {
    async select(t, f) { const rows = tables[t] ?? []; return f ? rows.filter((r) => match(r, f)) : [...rows]; },
    async insert(t, v) {
      const arr = Array.isArray(v) ? v : [v];
      const ins = arr.map((r, i) => ({ id: r.id ?? `${t}-${(tables[t]?.length ?? 0) + i}`, ...r }));
      tables[t] = [...(tables[t] ?? []), ...ins];
      return ins;
    },
    async update(t, f, values) {
      const rows = tables[t] ?? [];
      const updated: Row[] = [];
      tables[t] = rows.map((r) => { if (match(r, f)) { const n = { ...r, ...values }; updated.push(n); return n; } return r; });
      return updated;
    },
    async delete(t, f) { tables[t] = (tables[t] ?? []).filter((r) => !match(r, f)); },
  };
}

const tpl: Row = { id: 'tpl-tcr', name: 'TCR', carrier: '중국세관', route: 'TCR', anchor_type: 'container_no', min_count: 8, warning_text: null, rules: {}, required_photos: [{ key: 'seal', label: '씰', instruction: '', required: true }] };

function baseSeed(): Record<string, Row[]> {
  return {
    customers: [{ id: 'c1', name: '칭다오 파트너', contact: null, notes: null }],
    work_type_templates: [tpl],
    work_orders: [{ id: 'wo1', customer_id: 'c1', template_id: 'tpl-tcr', work_date: null, status: 'submitted', assignee_name: null, assignee_contact: null, shipper_label: null }],
    containers: [{ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }],
    photos: [
      { id: 'p-old', container_id: 'k1', slot_key: 'seal', display_path: 'o.webp', thumb_path: 'o-t.webp', file_hash: 'old', byte_size: 1, captured_at: '2026-07-02T01:00:00Z', original_path: null, gps_lat: null, gps_lng: null, status: 'uploaded' },
      { id: 'p-new', container_id: 'k1', slot_key: 'seal', display_path: 'n.webp', thumb_path: 'n-t.webp', file_hash: 'new', byte_size: 1, captured_at: '2026-07-02T05:00:00Z', original_path: null, gps_lat: null, gps_lng: null, status: 'uploaded' },
    ],
  };
}

test('getWorkOrderReview assembles order/template/customer/containers with latest-per-slot', async () => {
  const repo = createSupabaseAdminRepo(memPort(baseSeed()));
  const r = await repo.getWorkOrderReview('wo1');
  expect(r!.customer?.name).toContain('칭다오');
  expect(r!.template.route).toBe('TCR');
  expect(r!.containers[0].photos.map((p) => p.fileHash)).toEqual(['new']); // latest seal only
});

test('publish inserts a publication + viewer share_link, sets status, reuses token', async () => {
  const port = memPort(baseSeed());
  const repo = createSupabaseAdminRepo(port);
  const manifest = { route: 'TCR', customer: '칭다오 파트너', date: '2026-07-02', containers: [] };
  const { viewerToken } = await repo.publish('wo1', manifest);
  expect(viewerToken).toMatch(/^[A-Za-z0-9]+$/);
  const wo = (await port.select('work_orders', { col: 'id', val: 'wo1' }))[0];
  expect(wo.status).toBe('published');
  const links = await port.select('share_links', { col: 'work_order_id', val: 'wo1' });
  expect(links.some((l) => l.kind === 'viewer' && l.token === viewerToken)).toBe(true);
  const pubs = await port.select('publications', { col: 'work_order_id', val: 'wo1' });
  expect(pubs.length).toBe(1);
  expect((pubs[0].photo_manifest as any).route).toBe('TCR');
  const again = await repo.publish('wo1', manifest);
  expect(again.viewerToken).toBe(viewerToken);
});
