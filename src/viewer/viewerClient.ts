import type { AdminRepo } from '../admin/repo';
import type { ViewerManifest } from '../domain/viewer';
import { supabase } from '../lib/supabase';

export interface ViewerClient {
  bootstrap(token: string): Promise<ViewerManifest | null>;
}

type RpcFn = (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function createSupabaseViewerClient(rpc: RpcFn = (n, p) => supabase.rpc(n, p) as unknown as ReturnType<RpcFn>): ViewerClient {
  return {
    async bootstrap(token) {
      const { data, error } = await rpc('viewer_bootstrap', { p_token: token });
      if (error) throw new Error(error.message);
      return (data ?? null) as ViewerManifest | null;
    },
  };
}

export function createInMemoryViewerClient(repo: AdminRepo): ViewerClient {
  return { bootstrap: (token) => repo.getViewerManifest(token) };
}
