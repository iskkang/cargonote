import { supabase } from '../lib/supabase';

export type SignedUrlFn = (
  paths: string[], expiresIn: number,
) => Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: { message: string } | null }>;

const defaultSigner: SignedUrlFn = (paths, expiresIn) => supabase.storage.from('captures').createSignedUrls(paths, expiresIn) as Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: { message: string } | null }>;

export const VIEWER_URL_TTL = 31536000; // 1 year

async function signUrls(paths: string[], expiresIn: number, signer: SignedUrlFn): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await signer(paths, expiresIn);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path) out[d.path] = d.signedUrl;
  return out;
}

export function createThumbUrls(paths: string[], signer: SignedUrlFn = defaultSigner): Promise<Record<string, string>> {
  return signUrls(paths, 3600, signer);
}

export function createSignedViewerUrls(paths: string[], signer: SignedUrlFn = defaultSigner): Promise<Record<string, string>> {
  return signUrls(paths, VIEWER_URL_TTL, signer);
}
