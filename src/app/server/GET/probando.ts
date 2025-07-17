import { supabaseServer } from '@/lib/supabase/server';

export async function query<TableName extends keyof Database['public']['Tables'], Query extends string = '*'>(
  tableName: TableName,
  select: Query
) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from(tableName).select(select);

  if (error) {
    throw error;
  }

  return data;
}
