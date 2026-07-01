import { sha256Hex } from '../src/lib/hash';

test('hashes known ascii input', async () => {
  const bytes = new TextEncoder().encode('abc');
  const hex = await sha256Hex(bytes.buffer);
  expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('hash of a Blob matches its bytes', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])]);
  const a = await sha256Hex(blob);
  const b = await sha256Hex(new Uint8Array([1, 2, 3]).buffer);
  expect(a).toBe(b);
  expect(a).toHaveLength(64);
});
