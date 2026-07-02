import type { AdminRepo } from './repo';
import { createInMemoryAdminRepo } from './repo';
import { createSupabaseAdminRepo } from './supabaseRepo';
import { createSupabaseDbPort } from './db';
import { isSupabaseConfigured } from './repoConfig';
import { supabase } from '../lib/supabase';

let cached: AdminRepo | null = null;

export function getAdminRepo(): AdminRepo {
  if (!cached) {
    cached = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseAdminRepo(createSupabaseDbPort(supabase))
      : createInMemoryAdminRepo();
  }
  return cached;
}
