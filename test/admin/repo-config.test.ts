import { isSupabaseConfigured } from '../../src/admin/repoConfig';

test('true only for a real supabase.co URL', () => {
  expect(isSupabaseConfigured('https://sjycsfcfclthbxqcleim.supabase.co')).toBe(true);
});
test('false for placeholder, localhost, empty', () => {
  expect(isSupabaseConfigured('https://placeholder.supabase.co')).toBe(false);
  expect(isSupabaseConfigured('http://localhost:54321')).toBe(false);
  expect(isSupabaseConfigured(undefined)).toBe(false);
  expect(isSupabaseConfigured('')).toBe(false);
});
