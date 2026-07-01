// @vitest-environment node
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import { freshDb } from './pglite';

async function db() { return freshDb([schema]); }

test('creates the 8 phase-1 tables', async () => {
  const d = await db();
  const res = await d.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema='public' order by 1;");
  expect(res.rows.map((r) => r.table_name)).toEqual([
    'audit_logs', 'containers', 'customers', 'photos',
    'publications', 'share_links', 'work_orders', 'work_type_templates',
  ]);
});

test('work_orders.status rejects an invalid value', async () => {
  const d = await db();
  await d.exec("insert into customers (id, name) values ('11111111-1111-1111-1111-111111111111','C');");
  await d.exec(`insert into work_type_templates (id, name, anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');`);
  await expect(
    d.query(`insert into work_orders (customer_id, template_id, status) values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','bogus');`),
  ).rejects.toThrow();
});

test('deleting a work_order cascades to containers and photos', async () => {
  const d = await db();
  await d.exec(`
    insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
    insert into work_type_templates (id,name,anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');
    insert into work_orders (id,customer_id,template_id) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
    insert into containers (id,work_order_id,container_no) values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','TCLU1234567');
    insert into photos (container_id,file_hash) values ('44444444-4444-4444-4444-444444444444','abc');
  `);
  await d.exec("delete from work_orders where id='33333333-3333-3333-3333-333333333333';");
  const c = await d.query<{ n: number }>('select count(*)::int n from containers;');
  const p = await d.query<{ n: number }>('select count(*)::int n from photos;');
  expect(c.rows[0].n).toBe(0);
  expect(p.rows[0].n).toBe(0);
});

test('share_links.token is unique', async () => {
  const d = await db();
  await d.exec(`
    insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
    insert into work_type_templates (id,name,anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');
    insert into work_orders (id,customer_id,template_id) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
    insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','TOK','worker');
  `);
  await expect(
    d.query("insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','TOK','viewer');"),
  ).rejects.toThrow();
});
