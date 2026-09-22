'use server';

import { Logger } from '@/lib/logger';
import { parseSearchParams, stateToPrismaParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { DOCS_EQUIPMENT_PERMANENTES_SELECT, FK_SORT_MAP, VALID_SORT_FIELDS, buildWhereClause } from './lib/where';

const logger = new Logger('DocumentosEquiposPermanentes/queries');

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getEquipmentPermanentDocumentsPaginated(
  searchParams: DataTableSearchParams,
  equipmentId?: string
) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = await buildWhereClause(companyId, state, equipmentId);

    // Safe orderBy: multi-sort, solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    const safeOrderBy = [...resolvedSorts, { vehicles: { domain: 'asc' as const } }];

    const [data, total] = await Promise.all([
      prisma.documents_equipment.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DOCS_EQUIPMENT_PERMANENTES_SELECT,
      }),
      prisma.documents_equipment.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener documentos permanentes de equipos paginados', { data: { error } });
    throw new Error('Error al obtener los documentos permanentes de equipos');
  }
}

export type EquipmentPermanentDocumentListItem = Awaited<
  ReturnType<typeof getEquipmentPermanentDocumentsPaginated>
>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllEquipmentPermanentDocumentsForExport(
  searchParams: DataTableSearchParams,
  equipmentId?: string
) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = await buildWhereClause(companyId, state, equipmentId);

    const data = await prisma.documents_equipment.findMany({
      orderBy: [{ vehicles: { domain: 'asc' } }],
      where,
      select: DOCS_EQUIPMENT_PERMANENTES_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar documentos permanentes de equipos', { data: { error } });
    throw new Error('Error al exportar los documentos permanentes de equipos');
  }
}
