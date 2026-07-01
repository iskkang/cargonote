import type { RequiredPhotoSlot, TemplateRules, WorkTypeTemplate } from './types';

export interface RawTemplateRow {
  id: string; name: string; carrier: string | null; route: string | null;
  anchor_type: string; min_count: number; warning_text: string | null;
  rules: unknown; required_photos: unknown;
}

function parseSlot(raw: unknown): RequiredPhotoSlot {
  if (typeof raw !== 'object' || raw === null) throw new Error('slot must be an object');
  const s = raw as Record<string, unknown>;
  if (typeof s.key !== 'string') throw new Error('slot missing key');
  return {
    key: s.key,
    label: typeof s.label === 'string' ? s.label : '',
    instruction: typeof s.instruction === 'string' ? s.instruction : '',
    required: s.required === true,
  };
}

export function parseTemplate(row: RawTemplateRow): WorkTypeTemplate {
  if (!Array.isArray(row.required_photos)) throw new Error('required_photos must be an array');
  return {
    id: row.id,
    name: row.name,
    carrier: row.carrier,
    route: row.route,
    anchorType: row.anchor_type,
    minCount: row.min_count,
    warningText: row.warning_text,
    rules: (typeof row.rules === 'object' && row.rules !== null ? row.rules : {}) as TemplateRules,
    requiredPhotos: row.required_photos.map(parseSlot),
  };
}

export function requiredSlots(t: WorkTypeTemplate): RequiredPhotoSlot[] {
  return t.requiredPhotos.filter((s) => s.required);
}
