// @vitest-environment node
import stubs from './supabase-stubs.sql?raw';
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import rls from '../../supabase/migrations/0003_rls.sql?raw';
import { freshDb } from './pglite';

test('0003 applies cleanly and enables RLS on all 8 app tables', async () => {
  const d = await freshDb([stubs, schema, rls]);
  const r = await d.query<{ relname: string }>(`
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
    order by 1;`);
  expect(r.rows.map((x) => x.relname)).toEqual([
    'audit_logs', 'containers', 'customers', 'photos',
    'publications', 'share_links', 'work_orders', 'work_type_templates',
  ]);
});

test('authenticated has a policy on work_orders; anon has none', async () => {
  const d = await freshDb([stubs, schema, rls]);
  const r = await d.query<{ roles: string }>(
    "select array_to_string(polroles::regrole[], ',') as roles from pg_policy where polrelid='work_orders'::regclass;");
  const joined = r.rows.map((x) => x.roles).join(';');
  expect(joined).toContain('authenticated');
  expect(joined).not.toContain('anon');
});
