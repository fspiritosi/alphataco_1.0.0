'use server';

import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Mantenimiento/Gomeria/Plantillas');

// ============================================================================
// TYPES
// ============================================================================

export interface AxleInput {
  axle_number: number;
  tires_per_side: number;
  tire_size: string | null;
  is_drive_axle: boolean;
  is_spare: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE_SELECT = {
  id: true,
  name: true,
  description: true,
  company_id: true,
  is_active: true,
  created_at: true,
  _count: {
    select: { axles: true },
  },
  axles: {
    select: {
      id: true,
      axle_number: true,
      tires_per_side: true,
      tire_size: true,
      is_drive_axle: true,
      is_spare: true,
    },
    orderBy: { axle_number: 'asc' as const },
  },
};

const VALID_SORT_FIELDS = new Set(['name', 'created_at']);

const TEXT_FILTER_COLUMNS = ['name', 'description'];
const DATE_RANGE_COLUMNS = ['created_at'];

// ============================================================================
// INTERNAL WHERE BUILDER
// ============================================================================

function buildTemplatesWhereClause(state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['name', 'description']);

  const filtersWhere = buildFiltersWhere(
    state.filters,
    {},
    {
      exclude: [...TEXT_FILTER_COLUMNS, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  const filtersWhereAndConditions = (filtersWhere.AND as Record<string, unknown>[] | undefined) ?? [];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhere as Record<string, unknown> & {
    AND?: unknown;
  };

  return {
    is_active: true,
    ...searchWhere,
    ...filtersWhereWithoutAnd,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...(filtersWhereAndConditions.length > 0 ? { AND: filtersWhereAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getTemplatesPaginated(searchParams: DataTableSearchParams) {
  logger.debug('Fetching tire templates paginated');

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildTemplatesWhereClause(state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        resolvedSorts.push({ [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.tire_templates.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: TEMPLATE_SELECT,
      }),
      prisma.tire_templates.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error fetching tire templates paginated', { data: { error } });
    throw new Error(`Error al obtener las plantillas: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY
// ============================================================================

export async function getTemplatesForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exporting tire templates');

  try {
    const state = parseSearchParams(searchParams);
    const where = buildTemplatesWhereClause(state);

    const data = await prisma.tire_templates.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: TEMPLATE_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error exporting tire templates', { data: { error } });
    throw new Error('Error al exportar las plantillas');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, cross-filtering)
// ============================================================================

/**
 * Returns options and counts for a SINGLE faceted filter, with cross-filtering.
 * Templates have mostly text columns, so facets are minimal.
 */
export async function getTemplateSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  logger.debug('Getting template single facet', { data: { columnId } });

  const baseWhere = { is_active: true };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildTemplatesWhereClause(modified);
  }

  try {
    const where = crossWhere(columnId);

    logger.warn('getTemplateSingleFacet: unknown columnId', { data: { columnId } });
    void where; // used for cross-filter pattern
    return null;
  } catch (error) {
    logger.error('Error getting template single facet', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// CRUD ACTIONS
// ============================================================================

export async function getTemplateById(id: string) {
  logger.debug('Fetching template by id', { data: { id } });
  try {
    const template = await prisma.tire_templates.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        company_id: true,
        is_active: true,
        created_at: true,
        axles: {
          select: {
            id: true,
            axle_number: true,
            tires_per_side: true,
            tire_size: true,
            is_drive_axle: true,
            is_spare: true,
          },
          orderBy: { axle_number: 'asc' },
        },
      },
    });
    return template;
  } catch (error) {
    logger.error('Error fetching template by id', { data: { error, id } });
    throw error;
  }
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  companyId: string;
  axles: AxleInput[];
}) {
  logger.debug('Creating tire template', { data: { name: data.name } });
  try {
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.tire_templates.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          company_id: data.companyId,
        },
      });

      if (data.axles.length > 0) {
        await tx.tire_template_axles.createMany({
          data: data.axles.map((axle) => ({
            template_id: created.id,
            axle_number: axle.axle_number,
            tires_per_side: axle.tires_per_side,
            tire_size: axle.tire_size,
            is_drive_axle: axle.is_drive_axle,
            is_spare: axle.is_spare,
          })),
        });
      }

      return created;
    });

    return template;
  } catch (error) {
    logger.error('Error creating tire template', { data: { error } });
    throw error;
  }
}

export async function updateTemplate(
  id: string,
  data: {
    name: string;
    description?: string;
    axles: AxleInput[];
  }
) {
  logger.debug('Updating tire template', { data: { id, name: data.name } });
  try {
    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.tire_templates.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description ?? null,
        },
      });

      // Delete all existing axles and recreate
      await tx.tire_template_axles.deleteMany({ where: { template_id: id } });

      if (data.axles.length > 0) {
        await tx.tire_template_axles.createMany({
          data: data.axles.map((axle) => ({
            template_id: id,
            axle_number: axle.axle_number,
            tires_per_side: axle.tires_per_side,
            tire_size: axle.tire_size,
            is_drive_axle: axle.is_drive_axle,
            is_spare: axle.is_spare,
          })),
        });
      }

      return updated;
    });

    return template;
  } catch (error) {
    logger.error('Error updating tire template', { data: { error, id } });
    throw error;
  }
}

export async function deleteTemplate(id: string) {
  logger.debug('Soft-deleting tire template', { data: { id } });
  try {
    // Check if any active sub_type uses this template
    const subTypesWithTemplate = await prisma.sub_type.findMany({
      where: { tire_template_id: id, is_active: true },
      select: { id: true, name: true },
    });

    if (subTypesWithTemplate.length > 0) {
      const names = subTypesWithTemplate.map((s) => s.name).join(', ');
      throw new Error(`No se puede eliminar la plantilla porque está asignada a los siguientes subtipos: ${names}`);
    }

    // Check if any active vehicle uses this template as override
    const vehiclesWithTemplate = await prisma.vehicles.findMany({
      where: { tire_template_id: id, is_active: true },
      select: { id: true, domain: true },
    });

    if (vehiclesWithTemplate.length > 0) {
      const domains = vehiclesWithTemplate.map((v) => v.domain ?? 'Sin dominio').join(', ');
      throw new Error(
        `No se puede eliminar la plantilla porque está asignada como personalizada a los siguientes equipos: ${domains}`
      );
    }

    const template = await prisma.tire_templates.update({
      where: { id },
      data: { is_active: false },
    });
    return template;
  } catch (error) {
    logger.error('Error deleting tire template', { data: { error, id } });
    throw error;
  }
}

export async function assignTemplateToSubType(subTypeId: string, templateId: string) {
  logger.debug('Assigning template to sub_type', { data: { subTypeId, templateId } });
  try {
    // Simply update the sub_type's tire_template_id.
    // Vehicle positions are generated lazily (on-demand) when a service order is created.
    await prisma.sub_type.update({
      where: { id: subTypeId },
      data: { tire_template_id: templateId },
    });
  } catch (error) {
    logger.error('Error assigning template to sub_type', { data: { error, subTypeId, templateId } });
    throw error;
  }
}

export async function unassignTemplateFromSubType(subTypeId: string) {
  logger.debug('Unassigning template from sub_type', { data: { subTypeId } });
  try {
    await prisma.sub_type.update({
      where: { id: subTypeId },
      data: { tire_template_id: null },
    });
  } catch (error) {
    logger.error('Error unassigning template from sub_type', { data: { error, subTypeId } });
    throw error;
  }
}

// ============================================================================
// SUB_TYPE QUERY (for assignment)
// ============================================================================

export async function getSubTypesForTemplateAssign(companyId: string) {
  logger.debug('Fetching sub_types for template assignment', { data: { companyId } });
  try {
    const subTypes = await prisma.sub_type.findMany({
      where: { company_id: companyId, is_active: true },
      select: {
        id: true,
        name: true,
        tire_template_id: true,
        tire_template: { select: { id: true, name: true } },
        type_sub_type_typeTotype: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return subTypes;
  } catch (error) {
    logger.error('Error fetching sub_types for template assignment', { data: { error } });
    throw error;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type TemplateListItem = Awaited<ReturnType<typeof getTemplatesPaginated>>['data'][number];
export type TemplateDetail = Awaited<ReturnType<typeof getTemplateById>>;
export type SubTypeForAssign = Awaited<ReturnType<typeof getSubTypesForTemplateAssign>>[number];
