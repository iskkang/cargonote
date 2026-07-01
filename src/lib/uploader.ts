import type { CaptureItem } from './types';

export interface StorageLike {
  upload(path: string, body: Blob, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
}

export async function uploadCapture(item: CaptureItem, storage: StorageLike): Promise<string> {
  const path = `spike/${item.hash}.webp`;
  const { error } = await storage.upload(path, item.blob, { contentType: 'image/webp', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
