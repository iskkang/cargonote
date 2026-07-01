// @vitest-environment node
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import seed from '../../supabase/migrations/0002_seed_templates.sql?raw';
import { freshDb } from './pglite';

async function db() { return freshDb([schema, seed]); }

test('seeds exactly the TSR and TCR templates', async () => {
  const d = await db();
  const r = await d.query<{ route: string; carrier: string; min_count: number }>(
    'select route, carrier, min_count from work_type_templates order by route;');
  expect(r.rows).toEqual([
    { route: 'TCR', carrier: '중국세관', min_count: 8 },
    { route: 'TSR', carrier: 'FESCO', min_count: 8 },
  ]);
});

test('TSR template has 8 required photo slots incl. seal + csc', async () => {
  const d = await db();
  const r = await d.query<{ slots: number; has_seal: boolean; has_csc: boolean }>(`
    select jsonb_array_length(required_photos) as slots,
           required_photos @> '[{"key":"seal"}]' as has_seal,
           required_photos @> '[{"key":"csc"}]'  as has_csc
    from work_type_templates where route='TSR';`);
  expect(r.rows[0].slots).toBe(8);
  expect(r.rows[0].has_seal).toBe(true);
  expect(r.rows[0].has_csc).toBe(true);
});

test('TSR carries the FESCO rail-rejection warning and bolt-seal rule', async () => {
  const d = await db();
  const r = await d.query<{ warning_text: string; seal_type: string }>(`
    select warning_text, rules->>'seal_type' as seal_type
    from work_type_templates where route='TSR';`);
  expect(r.rows[0].warning_text).toContain('철도');
  expect(r.rows[0].seal_type).toBe('bolt');
});

test('TCR carries the customs return-to-Korea warning', async () => {
  const d = await db();
  const r = await d.query<{ warning_text: string }>(
    "select warning_text from work_type_templates where route='TCR';");
  expect(r.rows[0].warning_text).toContain('반송');
});
