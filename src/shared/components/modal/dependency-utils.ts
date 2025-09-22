import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Database } from '../../../../database.types';
import { DependencyConfig } from './DependencyValidationModal';

// Helpers de tipos basados en los generados de Supabase
export type TableName = keyof Database['public']['Tables'];
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type ColumnOf<T extends TableName> = keyof Row<T> & string;

export interface FetchDependenciesParams<T extends TableName, C extends ColumnOf<T>, Select extends string = '*'> {
  // Tabla donde se buscarán las dependencias (la "target")
  targetTable: T;
  // Columna de la tabla target que hace referencia al valor del registro fuente
  targetColumn: C;
  // Valor a comparar en targetColumn (tipado en función de la columna)
  value: Row<T>[C];
  // Select opcional de columnas a retornar (por defecto '*')
  select?: Select;
  // Límite de filas para listar en el modal (el total se obtiene con count)
  limit?: number;
  // Forzar uso de cliente server-side si se requiere
  server?: boolean;
}

export type FetchDependenciesResult<T extends TableName> = {
  data: Partial<Row<T>>[];
  count: number;
};

// Utilidad genérica para obtener dependencias de un valor en una tabla target
export async function fetchDependenciesForValue<
  T extends TableName,
  C extends ColumnOf<T>,
  Select extends string = '*',
>(params: FetchDependenciesParams<T, C, Select>) {
  const { targetTable, targetColumn, value, select = '*', limit = 10, server = false } = params;

  const supabase = supabaseBrowser();

  // 2) Datos (muestra limitada para visualizar en el modal)
  let dataQuery = supabase
    .from(targetTable)
    .select(select, { count: 'exact' })
    .eq(targetColumn, value as any)
    .limit(limit);

  const { data, error, count } = await dataQuery;
  if (error) {
    console.error('error', error);
  }
  if (error) throw error;

  // Tipamos como Partial<Row<T>>[] para no asumir que el select trae todas las columnas
  return {
    data: data,
    count: count ?? 0,
  };
}

export const fetchReplacementOptions = async (
  config: DependencyConfig,
  excludeId?: string
): Promise<{ id: string; name: string }[]> => {
  const supabase = supabaseBrowser();
  const table = config.sourceTable;

  const { data, error } = await supabase
    .from(table)
    .select(`${config.sourceColumn}, id`)
    .eq('is_active', true)
    .neq('id', excludeId || '')
    .order(config.sourceColumn, { ascending: true });

  if (error) throw error;

  const rows = (data as any[]) || [];
  // Devolvemos id = valor a escribir en la columna dependiente (name), y name como etiqueta
  return rows.map((row) => ({ id: String(row.id), name: String(row[config.sourceColumn]) }));
};
