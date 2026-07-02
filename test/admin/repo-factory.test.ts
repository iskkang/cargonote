import { getAdminRepo } from '../../src/admin/repoFactory';

// Test env URL is http://localhost:54321 (vite.config test.env) → not configured → in-memory repo.
test('returns the in-memory repo in the test environment (demo token resolves)', async () => {
  const repo = getAdminRepo();
  const r = await repo.getByWorkerToken('demotoken123');
  expect(r).not.toBeNull();
  expect(r!.template.route).toBe('TCR');
});

test('is a singleton (same instance across calls)', () => {
  expect(getAdminRepo()).toBe(getAdminRepo());
});
