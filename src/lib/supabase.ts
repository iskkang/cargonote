import { createClient } from '@supabase/supabase-js';

// Fall back to placeholders when env is absent (e.g. a preview/device build with no .env.local)
// so the app still loads and camera + offline capture work; uploads fail and stay queued
// until real VITE_SUPABASE_* are provided.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

export const supabase = createClient(url, key, {
  auth: { persistSession: true },
});
