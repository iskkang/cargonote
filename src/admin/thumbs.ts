import { supabase } from '../lib/supabase';

export type SignedUrlFn = (
  paths: string[], expiresIn: number,
) => Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: { message: string } | null }>;

const defaultSigner: SignedUrlFn = (paths, expiresIn) => supabase.storage.from('captures').createSignedUrls(paths, expiresIn) as Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: { message: string } | null }>;

export async function createThumbUrls(paths: string[], signer: SignedUrlFn = defaultSigner): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await signer(paths, 3600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path) out[d.path] = d.signedUrl;
  return out;
}
