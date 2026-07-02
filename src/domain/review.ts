import type { Container, Customer, Photo, WorkOrder, WorkTypeTemplate } from './types';

export interface ContainerReview { container: Container; photos: Photo[] }
export interface WorkOrderReview { order: WorkOrder; template: WorkTypeTemplate; customer: Customer | null; containers: ContainerReview[] }

// One photo per slot: the latest by capturedAt (ISO string → lexicographic = chronological).
// Photos with no slotKey are dropped (not part of the required-photo checklist).
export function latestPerSlot(photos: Photo[]): Photo[] {
  const best = new Map<string, Photo>();
  for (const p of photos) {
    if (!p.slotKey) continue;
    const cur = best.get(p.slotKey);
    if (!cur || (p.capturedAt ?? '') > (cur.capturedAt ?? '')) best.set(p.slotKey, p);
  }
  return [...best.values()];
}
