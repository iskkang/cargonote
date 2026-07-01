export function computeTargetSize(srcW: number, srcH: number, maxDim: number) {
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxDim ? maxDim / longest : 1;
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) };
}

async function encode(source: Blob, maxDim: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', quality),
  );
}

export async function makeVariants(source: Blob) {
  const display = await encode(source, 1600, 0.82);
  const thumb = await encode(source, 320, 0.7);
  return { display, thumb };
}
