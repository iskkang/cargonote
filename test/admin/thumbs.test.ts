import { createThumbUrls } from '../../src/admin/thumbs';

test('maps each path to its signed url', async () => {
  const signer = async (paths: string[]) => ({
    data: paths.map((p) => ({ path: p, signedUrl: `https://signed/${p}` })), error: null,
  });
  const out = await createThumbUrls(['a-t.webp', 'b-t.webp'], signer);
  expect(out).toEqual({ 'a-t.webp': 'https://signed/a-t.webp', 'b-t.webp': 'https://signed/b-t.webp' });
});

test('returns empty for no paths without calling the signer', async () => {
  let called = false;
  const signer = async () => { called = true; return { data: [], error: null }; };
  expect(await createThumbUrls([], signer)).toEqual({});
  expect(called).toBe(false);
});

test('throws on signer error', async () => {
  const signer = async () => ({ data: null, error: { message: 'nope' } });
  await expect(createThumbUrls(['x'], signer)).rejects.toThrow('nope');
});
