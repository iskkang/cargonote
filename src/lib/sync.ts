import type { CaptureItem } from './types';
import type { StorageLike } from './uploader';

export interface SyncDeps {
  pendingItems(): Promise<CaptureItem[]>;
  markUploaded(id: string): Promise<void>;
  uploadCapture(item: CaptureItem, storage: StorageLike): Promise<string>;
  storage: StorageLike;
}

export async function drainQueue(deps: SyncDeps): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0, failed = 0;
  for (const item of await deps.pendingItems()) {
    try {
      await deps.uploadCapture(item, deps.storage);
      await deps.markUploaded(item.id);
      uploaded++;
    } catch {
      failed++;
    }
  }
  return { uploaded, failed };
}
