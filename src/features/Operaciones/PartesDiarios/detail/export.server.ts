'use server';

import { Logger } from '@/lib/logger';
import { parseSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { buildRowSelect, buildWhereClause } from './lib/row-query';

const logger = new Logger('features/Operaciones/PartesDiarios/detail/export');

// ============================================================================
// 3. EXPORT QUERY (sin paginación)
// ============================================================================

/**
 * Obtiene todas las filas del parte diario para exportación.
 * Respeta los filtros activos pero sin paginación (skip/take).
 */
export async function getDailyReportDetailForExport(dailyReportId: string, searchParams: DataTableSearchParams) {
  logger.debug('Exportando filas del parte diario', { data: { dailyReportId } });

  try {
    const state = parseSearchParams(searchParams);
    const companyId = await getActiveCompanyId();
    const where = buildWhereClause(dailyReportId, state, companyId);

    const safeOrderBy = [
      { customers: { name: 'asc' as const } },
      { customer_services: { service_name: 'asc' as const } },
      { service_items: { item_name: 'asc' as const } },
    ];

    // Para export no necesitamos employees_diagram (no hay fecha de parte disponible aquí)
    const rowSelect = buildRowSelect();

    const data = await prisma.dailyreportrows.findMany({
      where,
      orderBy: safeOrderBy,
      select: rowSelect,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar filas del parte diario', {
      data: { error, dailyReportId },
    });
    throw new Error('No se pudieron exportar las filas del parte diario. Intente nuevamente.');
  }
}

export type DailyReportExportRow = Awaited<ReturnType<typeof getDailyReportDetailForExport>>[number];

