'use server';

import { Logger } from '@/lib/logger';
import { callFunction } from '@/shared/lib/sql';
import { z } from 'zod';

const logger = new Logger('shared/select-distinct');

export type MultiJoinPaths = {
  joins: Array<{
    from_table: string;
    to_table: string;
    from_column: string;
    to_column: string;
  }>;
  final_column: string;
};

const distinctValuesSchema = z.array(
  z.object({
    col_value: z.string().nullable(),
    col_count: z.coerce.number(),
  })
);

/**
 * Valores distintos (con conteo) de una columna, para las facetas del DataTable legacy
 * (`src/shared/components/data-table`). Llama a la función SQL `select_distinct_values`
 * (`prisma/sql/misc.sql`) vía `callFunction`; `tableName` y `select` son texto que la
 * función valida por su cuenta (arma el SQL con `quote_ident`).
 *
 * @param relation   JSON string `{"tabla_destino": "columna_fk"}` (mismo formato que usaban los llamadores).
 * @param multiJoinPaths joins encadenados hasta `final_column`.
 * @param p_filters  filtros de igualdad sobre la tabla base (`{ company_id, is_active }`).
 */
export async function querySelectDistinct<TableName extends string, Query extends string = '*'>(
  tableName: TableName,
  select: Query,
  relation?: string,
  multiJoinPaths?: MultiJoinPaths,
  p_filters?: Record<string, string | number | boolean | null> | null
) {
  try {
    const rows = await callFunction(
      'select_distinct_values',
      [
        tableName,
        select,
        { json: relation ? (JSON.parse(relation) as unknown) : null },
        { json: multiJoinPaths ?? null },
        { json: p_filters ?? null },
      ],
      distinctValuesSchema
    );

    // 'null' como texto es como la función devuelve los NULL de la columna.
    return rows.map((item) => ({
      ...item,
      col_value: item.col_value === 'null' ? null : item.col_value,
      display_value: item.col_value === 'null' ? '(Sin valor)' : item.col_value,
    }));
  } catch (error) {
    logger.error('Error en select_distinct_values', { data: { error, tableName, select } });
    throw error;
  }
}
