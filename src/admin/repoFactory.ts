import type { AdminRepo } from './repo';
import { createInMemoryAdminRepo } from './repo';
import { createSupabaseAdminRepo } from './supabaseRepo';
import { createSupabaseDbPort } from './db';
import { isSupabaseConfigured } from './repoConfig';
import { supabase } from '../lib/supabase';
import type { WorkerClient } from '../worker/workerClient';
import { createInMemoryWorkerClient, createSupabaseWorkerClient } from '../worker/workerClient';
import type { ViewerClient } from '../viewer/viewerClient';
import { createInMemoryViewerClient, createSupabaseViewerClient } from '../viewer/viewerClient';

let cached: AdminRepo | null = null;

export function getAdminRepo(): AdminRepo {
  if (!cached) {
    cached = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseAdminRepo(createSupabaseDbPort(supabase))
      : createInMemoryAdminRepo();
  }
  return cached;
}

let cachedWorker: WorkerClient | null = null;
export function getWorkerClient(): WorkerClient {
  if (!cachedWorker) {
    cachedWorker = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseWorkerClient()
      : createInMemoryWorkerClient(getAdminRepo());
  }
  return cachedWorker;
}

let cachedViewer: ViewerClient | null = null;
export function getViewerClient(): ViewerClient {
  if (!cachedViewer) {
    cachedViewer = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseViewerClient()
      : createInMemoryViewerClient(getAdminRepo());
  }
  return cachedViewer;
}
