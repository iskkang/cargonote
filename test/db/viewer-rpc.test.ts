// @vitest-environment node
import stubs from './supabase-stubs.sql?raw';
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import rpcs from '../../supabase/migrations/0007_viewer_rpc.sql?raw';
import { freshDb } from './pglite';

const seed = `
  insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
  insert into work_type_templates (id,name,anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');
  insert into work_orders (id,customer_id,template_id,status) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','published');
  insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','VTOK','viewer');
  insert into share_links (work_order_id,token,kind,revoked) values ('33333333-3333-3333-3333-333333333333','VDEAD','viewer',true);
  insert into publications (work_order_id,viewer_token,photo_manifest,published_at)
    values ('33333333-3333-3333-3333-333333333333','VTOK','{"route":"TCR","customer":"C","containers":[]}'::jsonb, now() - interval '1 hour');
  insert into publications (work_order_id,viewer_token,photo_manifest,published_at)
    values ('33333333-3333-3333-3333-333333333333','VTOK','{"route":"TCR-latest","customer":"C","containers":[]}'::jsonb, now());
`;
async function db() { return freshDb([stubs, schema, rpcs, seed]); }

test('viewer_bootstrap returns the latest publication manifest for a valid token', async () => {
  const d = await db();
  const r = await d.query<{ m: any }>("select viewer_bootstrap('VTOK') as m;");
  expect(r.rows[0].m.route).toBe('TCR-latest'); // newest published_at wins
});

test('viewer_bootstrap returns null for unknown and revoked tokens', async () => {
  const d = await db();
  expect((await d.query<{ m: any }>("select viewer_bootstrap('NOPE') as m;")).rows[0].m).toBeNull();
  expect((await d.query<{ m: any }>("select viewer_bootstrap('VDEAD') as m;")).rows[0].m).toBeNull();
});
