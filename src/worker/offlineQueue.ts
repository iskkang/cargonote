import { openDB } from 'idb';

/** A worker-slot photo waiting to upload. Stores the original blob so uploadSlotPhoto can replay it. */
export interface ShotItem {
  id: string; token: string; containerId: string; slotKey: string;
  blob: Blob; capturedAt: string; status: 'pending' | 'uploaded';
}

const DB = 'cargonote-worker';
const STORE = 'shots';

function db() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no indexeddb'));
  return openDB(DB, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('status', 'status');
      }
    },
  });
}

export async function enqueueShot(item: ShotItem): Promise<void> {
  const d = await db(); await d.put(STORE, item); d.close();
}

export async function pendingShots(): Promise<ShotItem[]> {
  const d = await db(); const r = await d.getAllFromIndex(STORE, 'status', 'pending'); d.close();
  return r as ShotItem[];
}

export async function markShotUploaded(id: string): Promise<void> {
  const d = await db(); const it = await d.get(STORE, id); if (it) await d.put(STORE, { ...it, status: 'uploaded' }); d.close();
}
