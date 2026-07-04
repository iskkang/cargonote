import { expandBoxes, packContainer, packMulti, rotate, type Placement } from '../../src/domain/pack';
import type { CargoLine } from '../../src/domain/stuffing';

const cargo = (over: Partial<CargoLine> = {}): CargoLine => ({ name: 'b', qty: 8, l: 100, w: 100, h: 100, weight: 10, stackable: true, ...over });

function overlaps(a: Placement, b: Placement) {
  const E = 0.1;
  return a.x < b.x + b.dx - E && b.x < a.x + a.dx - E &&
    a.y < b.y + b.dy - E && b.y < a.y + a.dy - E &&
    a.z < b.z + b.dz - E && b.z < a.z + a.dz - E;
}

test('packs 8 unit cubes exactly into a 2×2×2 container, no overlaps', () => {
  const { boxes } = expandBoxes([cargo()]);
  const res = packContainer(boxes, { L: 200, W: 200, H: 200 });
  expect(res.packed).toBe(8);
  for (let i = 0; i < res.placements.length; i++) {
    for (let j = i + 1; j < res.placements.length; j++) {
      expect(overlaps(res.placements[i], res.placements[j])).toBe(false);
    }
  }
  // all within bounds
  for (const p of res.placements) {
    expect(p.x + p.dx).toBeLessThanOrEqual(200.1);
    expect(p.y + p.dy).toBeLessThanOrEqual(200.1);
    expect(p.z + p.dz).toBeLessThanOrEqual(200.1);
  }
});

test('non-stackable cargo does not stack (all at floor level)', () => {
  const { boxes } = expandBoxes([cargo({ qty: 4, stackable: false })]);
  const res = packContainer(boxes, { L: 200, W: 200, H: 200 });
  expect(res.placements.every((p) => p.z < 0.1)).toBe(true);
});

test('packMulti spreads across multiple containers with per-container counts', () => {
  const { boxes } = expandBoxes([cargo({ qty: 16 })]); // 16 unit cubes; 8 fit per 2×2×2
  const m = packMulti(boxes, { L: 200, W: 200, H: 200, cbm: 8 }, 24);
  expect(m.containers.length).toBe(2);
  expect(m.containers.map((c) => c.count)).toEqual([8, 8]);
  expect(m.leftover).toBe(0);
  expect(Math.round(m.containers[0].fillPct)).toBe(100);
});

test('rotate keeps count and swaps container L/W on odd turns', () => {
  const { boxes } = expandBoxes([cargo()]);
  const res = packContainer(boxes, { L: 200, W: 200, H: 200 });
  const r = rotate(res.placements, 590, 235, 1);
  expect(r.placements.length).toBe(res.placements.length);
  expect(r.L).toBe(235);
  expect(r.W).toBe(590);
});
