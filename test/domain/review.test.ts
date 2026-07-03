import { latestPerSlot } from '../../src/domain/review';
import type { Photo } from '../../src/domain/types';

function ph(id: string, slotKey: string | null, capturedAt: string | null): Photo {
  return { id, containerId: 'k1', slotKey, originalPath: null, displayPath: `${id}.webp`, thumbPath: `${id}-t.webp`, fileHash: id, byteSize: 1, capturedAt, gpsLat: null, gpsLng: null, status: 'uploaded' };
}

test('keeps only the latest photo per slot key', () => {
  const out = latestPerSlot([
    ph('a', 'seal', '2026-07-02T01:00:00Z'),
    ph('b', 'seal', '2026-07-02T03:00:00Z'),
    ph('c', 'empty', '2026-07-02T02:00:00Z'),
  ]);
  const ids = out.map((p) => p.id).sort();
  expect(ids).toEqual(['b', 'c']);       // b (latest seal) + c (empty); a dropped
});

test('drops photos with a null slot key', () => {
  const out = latestPerSlot([ph('a', null, '2026-07-02T01:00:00Z'), ph('b', 'seal', '2026-07-02T01:00:00Z')]);
  expect(out.map((p) => p.id)).toEqual(['b']);
});

test('empty in, empty out', () => {
  expect(latestPerSlot([])).toEqual([]);
});

test('keeps ALL damage photos (not collapsed) alongside latest-per-required-slot', () => {
  const out = latestPerSlot([
    ph('a', 'seal', '2026-07-02T01:00:00Z'),
    ph('d1', 'damage', '2026-07-02T02:00:00Z'),
    ph('d2', 'damage', '2026-07-02T03:00:00Z'),
  ]);
  expect(out.map((p) => p.id).sort()).toEqual(['a', 'd1', 'd2']);
});

test('drops soft_deleted photos even when latest for their slot', () => {
  const out = latestPerSlot([
    ph('a', 'seal', '2026-07-02T01:00:00Z'),
    { ...ph('b', 'seal', '2026-07-02T05:00:00Z'), status: 'soft_deleted' },
  ]);
  expect(out.map((p) => p.id)).toEqual(['a']); // b is latest but soft_deleted → a wins
});
