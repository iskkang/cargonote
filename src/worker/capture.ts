import type { CaptureItem } from '../lib/types';

export interface CaptureToSlotDeps {
  makeVariants(b: Blob): Promise<{ display: Blob }>;
  sha256Hex(b: Blob): Promise<string>;
  enqueue(item: CaptureItem): Promise<'added' | 'duplicate'>;
}

export async function captureToSlot(
  photo: Blob,
  ctx: { slotKey: string; containerId: string; workOrderId: string },
  deps: CaptureToSlotDeps,
): Promise<'added' | 'duplicate'> {
  const { display } = await deps.makeVariants(photo);
  const hash = await deps.sha256Hex(display);
  return deps.enqueue({
    id: hash, hash, slotKey: ctx.slotKey, containerId: ctx.containerId, workOrderId: ctx.workOrderId,
    blob: display, capturedAt: Date.now(), gps: null, status: 'pending',
  });
}

export function capturedSlotKeys(items: CaptureItem[], containerId: string): string[] {
  return items
    .filter((i) => i.containerId === containerId && typeof i.slotKey === 'string')
    .map((i) => i.slotKey as string);
}
