import { randomToken } from '../../src/admin/token';
test('produces a url-safe token of the requested length', () => {
  const t = randomToken(24);
  expect(t).toHaveLength(24);
  expect(t).toMatch(/^[A-Za-z0-9]+$/);
});
test('produces different tokens', () => {
  expect(randomToken()).not.toBe(randomToken());
});
