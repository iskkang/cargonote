import { drainQueue, type SyncDeps } from '../src/lib/sync';
import type { CaptureItem } from '../src/lib/types';

const mk = (h: string): CaptureItem => ({ id: h, hash: h, slotKey: null, blob: new Blob([h]), capturedAt: 1, gps: null, status: 'pending' });

test('uploads all pending and marks them uploaded', async () => {
  const marked: string[] = [];
  const deps: SyncDeps = {
    pendingItems: async () => [mk('a'), mk('b')],
    markUploaded: async (id) => { marked.push(id); },
    uploadCapture: async (i) => `spike/${i.hash}.webp`,
    storage: {} as any,
  };
  const res = await drainQueue(deps);
  expect(res).toEqual({ uploaded: 2, failed: 0 });
  expect(marked.sort()).toEqual(['a', 'b']);
});

test('a failing upload is counted and not marked; others still succeed', async () => {
  const marked: string[] = [];
  const deps: SyncDeps = {
    pendingItems: async () => [mk('a'), mk('bad'), mk('c')],
    markUploaded: async (id) => { marked.push(id); },
    uploadCapture: async (i) => { if (i.hash === 'bad') throw new Error('x'); return 'ok'; },
    storage: {} as any,
  };
  const res = await drainQueue(deps);
  expect(res).toEqual({ uploaded: 2, failed: 1 });
  expect(marked.sort()).toEqual(['a', 'c']);
});
