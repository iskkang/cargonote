// v0 LCL stuffing estimator — volumetric ∧ weight. Not a true 3D packer.
// Cargo dims in cm, weight in kg. Container internal dims in metres.

export type ContainerId = '20ft' | '40ft' | '40hq';

export interface CargoLine {
  name: string; qty: number;
  l: number; w: number; h: number; // cm
  weight: number;                   // kg per unit
  stackable: boolean;
  color?: string;                   // hex, for the 3D/legend
  layDown?: boolean;                // may be tilted onto its side (default true)
}

export interface ContainerSpec {
  id: ContainerId; label: string;
  intL: number; intW: number; intH: number; // metres (internal)
  cbm: number;      // geometric internal volume (m³)
  payload: number;  // max cargo weight (kg)
}

export const CONTAINERS: ContainerSpec[] = [
  { id: '20ft', label: "20' GP", intL: 5.90, intW: 2.35, intH: 2.39, cbm: 33.14, payload: 28180 },
  { id: '40ft', label: "40' GP", intL: 12.03, intW: 2.35, intH: 2.39, cbm: 67.57, payload: 26680 },
  { id: '40hq', label: "40' HQ", intL: 12.03, intW: 2.35, intH: 2.69, cbm: 76.05, payload: 26580 },
];

export interface ContainerResult {
  spec: ContainerSpec;
  containersNeeded: number;
  binding: 'volume' | 'weight';
  fillPct: number;               // volume fill across the needed containers, 0–100
  maxUnitsSingle: number | null; // only when the list is a single SKU: max units in one container
  fits: boolean;                 // does every item physically fit (any rotation)
  cost?: number;                 // freight × containersNeeded, if a per-container cost was given
}

export interface StuffingResult {
  totalCbm: number; totalWeight: number; totalQty: number;
  utilization: number;
  perContainer: ContainerResult[];
  recommendedId: ContainerId | null;
}

const unitCbm = (c: CargoLine) => (c.l * c.w * c.h) / 1e6;

/** Item fits the container in some axis permutation (rotation allowed). */
function fitsAnyOrientation(c: CargoLine, s: ContainerSpec): boolean {
  const d = [c.l / 100, c.w / 100, c.h / 100].sort((a, b) => a - b);
  const cd = [s.intL, s.intW, s.intH].sort((a, b) => a - b);
  return d[0] <= cd[0] && d[1] <= cd[1] && d[2] <= cd[2];
}

export function computeStuffing(
  cargo: CargoLine[],
  opts?: { utilization?: number; freight?: Partial<Record<ContainerId, number>> },
): StuffingResult {
  const util = opts?.utilization ?? 0.85;
  const lines = cargo.filter((c) => c.qty > 0 && c.l > 0 && c.w > 0 && c.h > 0);
  const totalCbm = lines.reduce((s, c) => s + c.qty * unitCbm(c), 0);
  const totalWeight = lines.reduce((s, c) => s + c.qty * c.weight, 0);
  const totalQty = lines.reduce((s, c) => s + c.qty, 0);
  const single = lines.length === 1 ? lines[0] : null;

  const perContainer: ContainerResult[] = CONTAINERS.map((spec) => {
    const effCbm = spec.cbm * util;
    const byVol = totalCbm > 0 ? Math.ceil(totalCbm / effCbm) : 0;
    const byWt = totalWeight > 0 ? Math.ceil(totalWeight / spec.payload) : 0;
    const containersNeeded = Math.max(byVol, byWt, lines.length ? 1 : 0);
    const binding: 'volume' | 'weight' = totalCbm / effCbm >= totalWeight / spec.payload ? 'volume' : 'weight';
    const fillPct = containersNeeded > 0 ? Math.min(100, (totalCbm / (containersNeeded * spec.cbm)) * 100) : 0;
    const fits = lines.every((c) => fitsAnyOrientation(c, spec));
    let maxUnitsSingle: number | null = null;
    if (single) {
      const byV = Math.floor(effCbm / unitCbm(single));
      const byW = single.weight > 0 ? Math.floor(spec.payload / single.weight) : Infinity;
      maxUnitsSingle = fitsAnyOrientation(single, spec) ? Math.max(0, Math.min(byV, byW)) : 0;
    }
    const freight = opts?.freight?.[spec.id];
    return { spec, containersNeeded, binding, fillPct, maxUnitsSingle, fits, cost: freight != null ? freight * containersNeeded : undefined };
  });

  const eligible = perContainer.filter((p) => p.fits && p.containersNeeded > 0);
  let recommendedId: ContainerId | null = null;
  if (eligible.length) {
    const haveCost = eligible.every((p) => p.cost != null);
    const sorted = [...eligible].sort((a, b) =>
      haveCost ? (a.cost! - b.cost!) : (a.containersNeeded - b.containersNeeded) || (b.fillPct - a.fillPct));
    recommendedId = sorted[0].spec.id;
  }
  return { totalCbm, totalWeight, totalQty, utilization: util, perContainer, recommendedId };
}
