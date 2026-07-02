// @vitest-environment node
import stubs from './supabase-stubs.sql?raw';
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import rpcs from '../../supabase/migrations/0004_worker_rpcs.sql?raw';
import { freshDb } from './pglite';

const seed = `
  insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
  insert into work_type_templates (id,name,anchor_type,route) values ('22222222-2222-2222-2222-222222222222','T','container_no','TCR');
  insert into work_orders (id,customer_id,template_id) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
  insert into containers (id,work_order_id,container_no) values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','TCLU1234567');
  insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','GOODTOK','worker');
  insert into share_links (work_order_id,token,kind,revoked) values ('33333333-3333-3333-3333-333333333333','DEADTOK','worker',true);
`;

async function db() { return freshDb([stubs, schema, rpcs, seed]); }

test('worker_bootstrap returns order+template+containers for a valid token', async () => {
  const d = await db();
  const r = await d.query<{ b: any }>("select worker_bootstrap('GOODTOK') as b;");
  const b = r.rows[0].b;
  expect(b.order.id).toBe('33333333-3333-3333-3333-333333333333');
  expect(b.template.route).toBe('TCR');
  expect(b.containers.map((c: any) => c.container_no)).toEqual(['TCLU1234567']);
});

test('worker_bootstrap returns null for unknown and revoked tokens', async () => {
  const d = await db();
  const bad = await d.query<{ b: any }>("select worker_bootstrap('NOPE') as b;");
  const dead = await d.query<{ b: any }>("select worker_bootstrap('DEADTOK') as b;");
  expect(bad.rows[0].b).toBeNull();
  expect(dead.rows[0].b).toBeNull();
});

test('worker_insert_photo inserts for a valid token+container', async () => {
  const d = await db();
  await d.query(`select worker_insert_photo('GOODTOK','44444444-4444-4444-4444-444444444444','seal','d.webp','t.webp','h',10,now());`);
  const c = await d.query<{ n: number }>('select count(*)::int n from photos;');
  expect(c.rows[0].n).toBe(1);
});

test('worker_insert_photo rejects a container not in the work order', async () => {
  const d = await db();
  await expect(
    d.query(`select worker_insert_photo('GOODTOK','55555555-5555-5555-5555-555555555555','seal','d','t','h',1,now());`),
  ).rejects.toThrow();
});

test('worker_insert_photo rejects an invalid token', async () => {
  const d = await db();
  await expect(
    d.query(`select worker_insert_photo('NOPE','44444444-4444-4444-4444-444444444444','seal','d','t','h',1,now());`),
  ).rejects.toThrow();
});

test('worker_list_photos returns the container photos for a valid token', async () => {
  const d = await db();
  await d.query(`select worker_insert_photo('GOODTOK','44444444-4444-4444-4444-444444444444','seal','d.webp','t.webp','h',10,now());`);
  const r = await d.query<{ slot_key: string }>(`select slot_key from worker_list_photos('GOODTOK','44444444-4444-4444-4444-444444444444');`);
  expect(r.rows.map((x) => x.slot_key)).toEqual(['seal']);
});
