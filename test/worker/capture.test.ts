import { captureToSlot, capturedSlotKeys } from '../../src/worker/capture';
import type { CaptureItem } from '../../src/lib/types';

test('captureToSlot enqueues a display-variant item tagged with slot + container', async () => {
  let enq: CaptureItem | null = null;
  const res = await captureToSlot(new Blob(['x']), { slotKey: 'seal', containerId: 'ctn-1', workOrderId: 'wo-2' }, {
    makeVariants: async () => ({ display: new Blob(['d']) }),
    sha256Hex: async () => 'hash1',
    enqueue: async (item) => { enq = item; return 'added'; },
  });
  expect(res).toBe('added');
  expect(enq!.slotKey).toBe('seal');
  expect(enq!.containerId).toBe('ctn-1');
  expect(enq!.workOrderId).toBe('wo-2');
  expect(enq!.hash).toBe('hash1');
});

test('capturedSlotKeys returns slot keys for a container only', () => {
  const items = [
    { id: '1', hash: '1', slotKey: 'empty', containerId: 'ctn-1', workOrderId: 'wo-2', blob: new Blob(), capturedAt: 1, gps: null, status: 'pending' },
    { id: '2', hash: '2', slotKey: 'seal', containerId: 'ctn-2', workOrderId: 'wo-2', blob: new Blob(), capturedAt: 1, gps: null, status: 'pending' },
  ] as CaptureItem[];
  expect(capturedSlotKeys(items, 'ctn-1')).toEqual(['empty']);
});
