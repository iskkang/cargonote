import { createSupabaseDbPort } from '../../src/admin/db';

// Minimal fake of the supabase query builder: a thenable that also chains .eq/.select/.insert.
function fakeClient(resp: { data?: unknown; error?: { message: string } | null }) {
  const result = { data: resp.data ?? null, error: resp.error ?? null };
  const calls: any[] = [];
  const builder: any = {
    select: (...a: any[]) => { calls.push(['select', ...a]); return builder; },
    insert: (...a: any[]) => { calls.push(['insert', ...a]); return builder; },
    eq: (...a: any[]) => { calls.push(['eq', ...a]); return builder; },
    then: (onF: any, onR: any) => Promise.resolve(result).then(onF, onR),
  };
  const client: any = { from: (t: string) => { calls.push(['from', t]); return builder; } };
  return { client, calls };
}

test('select returns rows', async () => {
  const { client } = fakeClient({ data: [{ id: '1' }] });
  const db = createSupabaseDbPort(client);
  expect(await db.select('customers')).toEqual([{ id: '1' }]);
});

test('select with filter calls eq', async () => {
  const { client, calls } = fakeClient({ data: [] });
  const db = createSupabaseDbPort(client);
  await db.select('work_orders', { col: 'id', val: 'wo1' });
  expect(calls).toContainEqual(['eq', 'id', 'wo1']);
});

test('select throws on error', async () => {
  const { client } = fakeClient({ error: { message: 'boom' } });
  const db = createSupabaseDbPort(client);
  await expect(db.select('customers')).rejects.toThrow('boom');
});

test('insert returns inserted rows', async () => {
  const { client } = fakeClient({ data: [{ id: 'x' }] });
  const db = createSupabaseDbPort(client);
  expect(await db.insert('work_orders', { a: 1 })).toEqual([{ id: 'x' }]);
});

test('insert throws on error', async () => {
  const { client } = fakeClient({ error: { message: 'nope' } });
  const db = createSupabaseDbPort(client);
  await expect(db.insert('photos', { a: 1 })).rejects.toThrow('nope');
});
