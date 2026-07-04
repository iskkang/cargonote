// v1 greedy 3D packer (free-cuboid / guillotine) — rotation + lay-down + stacking.
// Not optimal (NP-hard), but produces a valid, non-overlapping arrangement with
// real coordinates to render. All lengths in cm.

import type { CargoLine } from './stuffing';

export const PALETTE = ['#01888F', '#E0A100', '#22507A', '#16A9B0', '#015056', '#1B3E5C', '#8895A2'];

export interface Box { line: number; l: number; w: number; h: number; stackable: boolean; color: string }
export interface Placement { line: number; color: string; x: number; y: number; z: number; dx: number; dy: number; dz: number }
export interface PackResult { placements: Placement[]; packed: number; total: number; truncated: boolean }

const EPS = 0.01;

/** Expand cargo lines into individual boxes (capped for perf/rendering). */
export function expandBoxes(cargo: CargoLine[], cap = 240): { boxes: Box[]; truncated: boolean } {
  const boxes: Box[] = [];
  let truncated = false;
  cargo.forEach((c, i) => {
    if (c.qty <= 0 || c.l <= 0 || c.w <= 0 || c.h <= 0) return;
    const color = PALETTE[i % PALETTE.length];
    for (let k = 0; k < c.qty; k++) {
      if (boxes.length >= cap) { truncated = true; return; }
      boxes.push({ line: i, l: c.l, w: c.w, h: c.h, stackable: c.stackable, color });
    }
  });
  return { boxes, truncated };
}

function orientations(b: Box): [number, number, number][] {
  const p: [number, number, number][] = [
    [b.l, b.w, b.h], [b.l, b.h, b.w], [b.w, b.l, b.h], [b.w, b.h, b.l], [b.h, b.l, b.w], [b.h, b.w, b.l],
  ];
  const seen = new Set<string>();
  const out: [number, number, number][] = [];
  for (const o of p) { const k = o.join('x'); if (!seen.has(k)) { seen.add(k); out.push(o); } }
  return out.sort((a, c) => a[2] - c[2]); // flattest first → prefers lay-down / stacking
}

interface Free { x: number; y: number; z: number; dx: number; dy: number; dz: number }

export function packContainer(boxes: Box[], container: { L: number; W: number; H: number }): PackResult {
  const sorted = [...boxes].sort((a, b) => (b.l * b.w * b.h) - (a.l * a.w * a.h));
  const free: Free[] = [{ x: 0, y: 0, z: 0, dx: container.L, dy: container.W, dz: container.H }];
  const placements: Placement[] = [];

  for (const box of sorted) {
    free.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x); // fill bottom-back-left first
    let placed = false;
    for (const fs of free) {
      let done = false;
      for (const [dx, dy, dz] of orientations(box)) {
        if (dx <= fs.dx + EPS && dy <= fs.dy + EPS && dz <= fs.dz + EPS) {
          placements.push({ line: box.line, color: box.color, x: fs.x, y: fs.y, z: fs.z, dx, dy, dz });
          const splits: Free[] = [];
          if (fs.dx - dx > EPS) splits.push({ x: fs.x + dx, y: fs.y, z: fs.z, dx: fs.dx - dx, dy: fs.dy, dz: fs.dz });
          if (fs.dy - dy > EPS) splits.push({ x: fs.x, y: fs.y + dy, z: fs.z, dx, dy: fs.dy - dy, dz: fs.dz });
          if (box.stackable && fs.dz - dz > EPS) splits.push({ x: fs.x, y: fs.y, z: fs.z + dz, dx, dy, dz: fs.dz - dz });
          free.splice(free.indexOf(fs), 1, ...splits);
          done = true; break;
        }
      }
      if (done) { placed = true; break; }
    }
    if (!placed) { /* leftover — not placed in this container */ }
  }

  return { placements, packed: placements.length, total: boxes.length, truncated: false };
}

/** Rotate an arrangement 90°·r about the container's vertical axis (for 4 view angles). */
export function rotate(placements: Placement[], L: number, W: number, r: number): { placements: Placement[]; L: number; W: number } {
  let pl = placements, cl = L, cw = W;
  for (let i = 0; i < ((r % 4) + 4) % 4; i++) {
    const w = cw;
    pl = pl.map((p) => ({ ...p, x: w - (p.y + p.dy), y: p.x, dx: p.dy, dy: p.dx }));
    [cl, cw] = [cw, cl];
  }
  return { placements: pl, L: cl, W: cw };
}
