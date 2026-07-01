// @vitest-environment node
import { freshDb } from './pglite';

test('fresh pglite runs SQL and returns rows', async () => {
  const db = await freshDb(['create table t (id int);', 'insert into t values (1),(2);']);
  const res = await db.query<{ n: number }>('select count(*)::int as n from t;');
  expect(res.rows[0].n).toBe(2);
});
