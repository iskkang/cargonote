import type { RequiredPhotoSlot, WorkTypeTemplate } from './types';

export interface ChecklistStatus {
  satisfied: string[];
  missing: RequiredPhotoSlot[];
  complete: boolean;
}

export function checklistStatus(capturedSlotKeys: string[], template: WorkTypeTemplate): ChecklistStatus {
  const captured = new Set(capturedSlotKeys);
  const required = template.requiredPhotos.filter((s) => s.required);
  const missing = required.filter((s) => !captured.has(s.key));
  const satisfied = required.filter((s) => captured.has(s.key)).map((s) => s.key);
  return { satisfied, missing, complete: missing.length === 0 };
}
