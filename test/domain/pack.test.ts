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

test('maxLayers caps stacking (1 layer → floor only)', () => {
  const { boxes } = expandBoxes([cargo({ qty: 8 })]);
  const res = packContainer(boxes, { L: 200, W: 200, H: 200 }, { maxLayers: 1 });
  expect(res.placements.every((p) => p.z < 0.1)).toBe(true); // no stacking
  expect(res.packed).toBe(4); // 2×2 on the floor
});

test('layDown:false keeps a too-tall box upright (cannot be tilted to fit)', () => {
  const box = { l: 100, w: 100, h: 250 }; // 250 tall — taller than the 200-high container
  const cont = { L: 300, W: 200, H: 200 }; // but 300 long, so it fits lying on its side
  const upright = expandBoxes([cargo({ qty: 1, ...box, layDown: false })]);
  expect(packContainer(upright.boxes, cont).packed).toBe(0);
  const tilt = expandBoxes([cargo({ qty: 1, ...box, layDown: true })]);
  expect(packContainer(tilt.boxes, cont).packed).toBe(1);
});

test('maxStackWeight stops a heavy box resting on a fragile one', () => {
  const cont = { L: 100, W: 100, H: 300 }; // 1×1 footprint — the only way to fit 2 is to stack
  const fragile = expandBoxes([cargo({ qty: 2, l: 100, w: 100, h: 100, weight: 10, maxStackWeight: 5 })]);
  expect(packContainer(fragile.boxes, cont).packed).toBe(1);
  const sturdy = expandBoxes([cargo({ qty: 2, l: 100, w: 100, h: 100, weight: 10 })]);
  expect(packContainer(sturdy.boxes, cont).packed).toBe(2);
});

test('maxStackHeight limits how tall a stack on a box may grow', () => {
  const cont = { L: 100, W: 100, H: 300 };
  const capped = expandBoxes([cargo({ qty: 2, l: 100, w: 100, h: 100, weight: 1, maxStackHeight: 50 })]);
  expect(packContainer(capped.boxes, cont).packed).toBe(1); // a 100-tall box exceeds the 50cm top allowance
  const open = expandBoxes([cargo({ qty: 2, l: 100, w: 100, h: 100, weight: 1 })]);
  expect(packContainer(open.boxes, cont).packed).toBe(2);
});

test('rotate keeps count and swaps container L/W on odd turns', () => {
  const { boxes } = expandBoxes([cargo()]);
  const res = packContainer(boxes, { L: 200, W: 200, H: 200 });
  const r = rotate(res.placements, 590, 235, 1);
  expect(r.placements.length).toBe(res.placements.length);
  expect(r.L).toBe(235);
  expect(r.W).toBe(590);
});
