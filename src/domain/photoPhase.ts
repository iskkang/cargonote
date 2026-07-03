import type { RequiredPhotoSlot } from './types';

/** Capture phases for grouping the required-photo checklist. Client-side mapping
 * (carrier-spec templates stay untouched); move to template data when formalized. */
export type Phase = '반입' | '적입' | '봉인' | '기타';

const SLOT_PHASE: Record<string, Phase> = {
  empty: '반입',
  half: '적입', full: '적입', shoring: '적입',
  one_door: '봉인', sealed: '봉인', seal: '봉인', csc: '봉인',
};

const ORDER: Phase[] = ['반입', '적입', '봉인', '기타'];

export function slotPhase(key: string | null | undefined): Phase {
  return (key && SLOT_PHASE[key]) || '기타';
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
