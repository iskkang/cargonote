import type { Container, Customer, Photo, WorkOrder, WorkTypeTemplate } from './types';

export interface ContainerReview { container: Container; photos: Photo[] }
export interface WorkOrderReview { order: WorkOrder; template: WorkTypeTemplate; customer: Customer | null; containers: ContainerReview[] }

// Special slot key for damage/extra photos: the worker may send several, so they are
// NOT collapsed to one-per-slot (unlike required slots).
export const DAMAGE_SLOT = 'damage';

// One photo per required slot: the latest by capturedAt (ISO string → lexicographic = chronological).
// Damage photos (slotKey === 'damage') are all kept. Photos with no slotKey, or soft-deleted, are dropped.
export function latestPerSlot(photos: Photo[]): Photo[] {
  const best = new Map<string, Photo>();
  const damage: Photo[] = [];
  for (const p of photos) {
    if (!p.slotKey || p.status === 'soft_deleted') continue;
    if (p.slotKey === DAMAGE_SLOT) { damage.push(p); continue; }
    const cur = best.get(p.slotKey);
    if (!cur || (p.capturedAt ?? '') > (cur.capturedAt ?? '')) best.set(p.slotKey, p);
  }
  return [...best.values(), ...damage];
}
