import type { RequiredPhotoSlot } from './types';

/** Capture phases for grouping the required-photo checklist. Client-side mapping
 * (carrier-spec templates stay untouched); move to template data when formalized. */
export type Phase = '搬入' | 'バンニング' | '封印' | 'その他';

const SLOT_PHASE: Record<string, Phase> = {
  empty: '搬入',
  half: 'バンニング', full: 'バンニング', shoring: 'バンニング',
  one_door: '封印', sealed: '封印', seal: '封印', csc: '封印',
};

const ORDER: Phase[] = ['搬入', 'バンニング', '封印', 'その他'];

export function slotPhase(key: string | null | undefined): Phase {
  return (key && SLOT_PHASE[key]) || 'その他';
}

export interface PhaseGroup { phase: Phase; slots: RequiredPhotoSlot[] }

export function groupByPhase(slots: RequiredPhotoSlot[]): PhaseGroup[] {
  const map = new Map<Phase, RequiredPhotoSlot[]>();
  for (const s of slots) {
    const p = slotPhase(s.key);
    (map.get(p) ?? map.set(p, []).get(p)!).push(s);
  }
  return ORDER.filter((p) => map.has(p)).map((p) => ({ phase: p, slots: map.get(p)! }));
}
