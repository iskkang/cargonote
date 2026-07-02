import type { SupabaseClient } from '@supabase/supabase-js';

export type Row = Record<string, unknown>;
export interface Filter { col: string; val: string }

export interface DbPort {
  select(table: string, filter?: Filter): Promise<Row[]>;
  insert(table: string, values: Row | Row[]): Promise<Row[]>;
}

export function createSupabaseDbPort(client: SupabaseClient): DbPort {
  return {
    async select(table, filter) {
      let q = client.from(table).select('*');
      if (filter) q = q.eq(filter.col, filter.val) as typeof q;
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    async insert(table, values) {
      const { data, error } = await client.from(table).insert(values).select();
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  };
}
