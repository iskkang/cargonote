import type { Container, Photo, WorkOrder, WorkTypeTemplate } from '../domain/types';
import type { AdminRepo, NewPhoto } from '../admin/repo';
import { parseTemplate, type RawTemplateRow } from '../domain/template';
import { rowToContainer, rowToPhoto, rowToWorkOrder } from '../admin/supabaseMappers';
import { supabase } from '../lib/supabase';

export interface WorkerBundle { order: WorkOrder; template: WorkTypeTemplate; containers: Container[] }

export interface WorkerClient {
  bootstrap(token: string): Promise<WorkerBundle | null>;
  insertPhoto(token: string, p: NewPhoto): Promise<void>;
  listPhotos(token: string, containerId: string): Promise<Photo[]>;
}

type RpcFn = (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function createSupabaseWorkerClient(rpc: RpcFn = (n, p) => supabase.rpc(n, p)): WorkerClient {
  return {
    async bootstrap(token) {
      const { data, error } = await rpc('worker_bootstrap', { p_token: token });
      if (error) throw new Error(error.message);
      if (!data) return null;
      const d = data as { order: Record<string, unknown>; template: Record<string, unknown>; containers: Record<string, unknown>[] };
      return {
        order: rowToWorkOrder(d.order),
        template: parseTemplate(d.template as unknown as RawTemplateRow),
        containers: (d.containers ?? []).map(rowToContainer),
      };
    },
    async insertPhoto(token, p) {
      const { error } = await rpc('worker_insert_photo', {
        p_token: token, p_container_id: p.containerId, p_slot_key: p.slotKey,
        p_display_path: p.displayPath, p_thumb_path: p.thumbPath, p_file_hash: p.fileHash,
        p_byte_size: p.byteSize, p_captured_at: p.capturedAt,
      });
      if (error) throw new Error(error.message);
    },
    async listPhotos(token, containerId) {
      const { data, error } = await rpc('worker_list_photos', { p_token: token, p_container_id: containerId });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(rowToPhoto);
    },
  };
}

export function createInMemoryWorkerClient(repo: AdminRepo): WorkerClient {
  return {
    async bootstrap(token) {
      const r = await repo.getByWorkerToken(token);
      return r ? { order: r.order, template: r.template, containers: r.containers } : null;
    },
    async insertPhoto(_token, p) { await repo.insertPhoto(p); },
    async listPhotos(_token, containerId) { return repo.listPhotos(containerId); },
  };
}
