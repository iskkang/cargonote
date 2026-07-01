import { openDB, type IDBPDatabase } from 'idb';
import type { CaptureItem } from './types';

const DB_NAME = 'cargolink-capture';
const STORE = 'captures';

function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('status', 'status');
      }
    },
    blocked() {},
    blocking() {
      // Close this connection when another connection needs the DB (e.g. deleteDB)
    },
    terminated() {},
  });
}

export async function enqueue(item: CaptureItem): Promise<'added' | 'duplicate'> {
  const d = await db();
  const result = await (async () => {
    if (await d.get(STORE, item.id)) return 'duplicate' as const;
    await d.put(STORE, item);
    return 'added' as const;
  })();
  d.close();
  return result;
}

export async function allItems(): Promise<CaptureItem[]> {
  const d = await db();
  const result = await d.getAll(STORE);
  d.close();
  return result;
}

export async function pendingItems(): Promise<CaptureItem[]> {
  const d = await db();
  const result = await d.getAllFromIndex(STORE, 'status', 'pending');
  d.close();
  return result;
}

export async function hasHash(hash: string): Promise<boolean> {
  const d = await db();
  const result = Boolean(await d.get(STORE, hash));
  d.close();
  return result;
}

export async function markUploaded(id: string): Promise<void> {
  const d = await db();
  const item = await d.get(STORE, id);
  if (item) await d.put(STORE, { ...item, status: 'uploaded' });
  d.close();
}
