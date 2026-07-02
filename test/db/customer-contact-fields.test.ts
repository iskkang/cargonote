// @vitest-environment node
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import contactCols from '../../supabase/migrations/0008_customer_contact_fields.sql?raw';
import { freshDb } from './pglite';

test('0008 adds contact_name, phone, email to customers', async () => {
  const d = await freshDb([schema, contactCols]);
  const res = await d.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_name='customers';");
  const cols = res.rows.map((r) => r.column_name);
  expect(cols).toContain('contact_name');
  expect(cols).toContain('phone');
  expect(cols).toContain('email');
});
