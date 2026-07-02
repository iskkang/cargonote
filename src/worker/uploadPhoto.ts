import type { NewPhoto } from '../admin/repo';

export interface PhotoStorage {
  upload(path: string, body: Blob, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
}

export interface UploadSlotDeps {
  makeVariants(b: Blob): Promise<{ display: Blob; thumb: Blob }>;
  sha256Hex(b: Blob): Promise<string>;
  storage: PhotoStorage;
  insertPhoto(p: NewPhoto): Promise<void>;
  now(): string;
}

export async function uploadSlotPhoto(
  photo: Blob,
  ctx: { slotKey: string; containerId: string },
  deps: UploadSlotDeps,
): Promise<{ displayPath: string; thumbPath: string; hash: string }> {
  const { display, thumb } = await deps.makeVariants(photo);
  const hash = await deps.sha256Hex(display);
  const base = `containers/${ctx.containerId}/${ctx.slotKey}-${hash}`;
  const displayPath = `${base}.webp`;
  const thumbPath = `${base}-thumb.webp`;

  const d = await deps.storage.upload(displayPath, display, { contentType: 'image/webp', upsert: true });
  if (d.error) throw new Error(d.error.message);
  const t = await deps.storage.upload(thumbPath, thumb, { contentType: 'image/webp', upsert: true });
  if (t.error) throw new Error(t.error.message);

  await deps.insertPhoto({
    containerId: ctx.containerId, slotKey: ctx.slotKey, displayPath, thumbPath,
    fileHash: hash, byteSize: display.size, capturedAt: deps.now(),
  });
  return { displayPath, thumbPath, hash };
}
