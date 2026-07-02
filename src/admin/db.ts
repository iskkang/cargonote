import type { SupabaseClient } from '@supabase/supabase-js';

export type Row = Record<string, unknown>;
export interface Filter { col: string; val: string }

export interface DbPort {
  select(table: string, filter?: Filter): Promise<Row[]>;
  insert(table: string, values: Row | Row[]): Promise<Row[]>;
  update(table: string, match: Filter, values: Row): Promise<Row[]>;
  delete(table: string, match: Filter): Promise<void>;
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
    async update(table, match, values) {
      const { data, error } = await client.from(table).update(values).eq(match.col, match.val).select();
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    async delete(table, match) {
      const { error } = await client.from(table).delete().eq(match.col, match.val);
      if (error) throw new Error(error.message);
    },
  };
}
