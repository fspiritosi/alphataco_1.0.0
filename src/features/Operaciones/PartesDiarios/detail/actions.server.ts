'use server';

import { Logger } from '@/lib/logger';
import {
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';

const logger = new Logger('features/Operaciones/PartesDiarios/detail');

/** Tipo del cliente transaccional de Prisma (evita TS2589 con Omit<typeof prisma, ...>) */
type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de dailyreportrows que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'status',
  'type_service',
  'working_day',
  'start_time',
  'end_time',
  'description',
  'remit_number',
  'completed_day',
  'completed_night',
  'created_at',
  'updated_at',
]);

/** Mapping de columnId a ordenamiento Prisma para FKs */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  customer: (dir) => ({ customers: { name: dir } }),
  service: (dir) => ({ customer_services: { service_name: dir } }),
  item: (dir) => ({ service_items: { item_name: dir } }),
  sector: (dir) => ({ service_sectors: { sectors: { name: dir } } }),
  area: (dir) => ({ service_areas: { areas_cliente: { descripcion_corta: dir } } }),
};

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS: string[] = [];

/** Columnas de texto libre */
const TEXT_COLUMNS = ['description', 'remit_number', 'cancel_reason', 'working_day'];

/** Columnas manejadas manualmente (no pasar a buildFiltersWhere) */
const MANUALLY_HANDLED = [
  'customer',
  'service',
  'item',
  'sector',
  'area',
  'completed_day',
  'completed_night',
  'employees',
  'equipment',
  'customer_equipment',
  ...TEXT_COLUMNS,
];

/** Mapping de columnId → campo real en Prisma (para enums/directos) */
const COLUMN_MAP: Record<string, string> = {
  status: 'status',
  type_service: 'type_service',
};

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Construye el WHERE clause compartido entre paginated, export y facets.
 * Acepta dailyReportId para filtrar siempre al parte correspondiente.
 */
function buildWhereClause(dailyReportId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['description', 'remit_number', 'cancel_reason', 'working_day']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...MANUALLY_HANDLED, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtros manuales para FK y booleanos
  const manualFilters: Record<string, unknown>[] = [];

  // customer (FK UUID nullable)
  const customerValues = state.filters['customer'];
  if (customerValues?.length) {
    const hasNull = customerValues.includes(NULL_FILTER_VALUE);
    const realValues = customerValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({ OR: [{ customer_id: { in: realValues } }, { customer_id: null }] });
    } else if (hasNull) {
      manualFilters.push({ customer_id: null });
    } else {
      manualFilters.push({ customer_id: realValues.length === 1 ? realValues[0] : { in: realValues } });
    }
  }

  // service (FK UUID nullable)
  const serviceValues = state.filters['service'];
  if (serviceValues?.length) {
    const hasNull = serviceValues.includes(NULL_FILTER_VALUE);
    const realValues = serviceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({ OR: [{ service_id: { in: realValues } }, { service_id: null }] });
    } else if (hasNull) {
      manualFilters.push({ service_id: null });
    } else {
      manualFilters.push({ service_id: realValues.length === 1 ? realValues[0] : { in: realValues } });
    }
  }

  // item (FK UUID nullable)
  const itemValues = state.filters['item'];
  if (itemValues?.length) {
    const hasNull = itemValues.includes(NULL_FILTER_VALUE);
    const realValues = itemValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({ OR: [{ item_id: { in: realValues } }, { item_id: null }] });
    } else if (hasNull) {
      manualFilters.push({ item_id: null });
    } else {
      manualFilters.push({ item_id: realValues.length === 1 ? realValues[0] : { in: realValues } });
    }
  }

  // sector (FK UUID nullable → via service_sectors pivot)
  const sectorValues = state.filters['sector'];
  if (sectorValues?.length) {
    const hasNull = sectorValues.includes(NULL_FILTER_VALUE);
    const realValues = sectorValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({
        OR: [{ service_sectors: { sectors: { id: { in: realValues } } } }, { sector_service_id: null }],
      });
    } else if (hasNull) {
      manualFilters.push({ sector_service_id: null });
    } else {
      manualFilters.push({
        service_sectors: {
          sectors: { id: realValues.length === 1 ? realValues[0] : { in: realValues } },
        },
      });
    }
  }

  // area (FK UUID nullable → via service_areas pivot)
  const areaValues = state.filters['area'];
  if (areaValues?.length) {
    const hasNull = areaValues.includes(NULL_FILTER_VALUE);
    const realValues = areaValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({
        OR: [{ service_areas: { areas_cliente: { id: { in: realValues } } } }, { areas_service_id: null }],
      });
    } else if (hasNull) {
      manualFilters.push({ areas_service_id: null });
    } else {
      manualFilters.push({
        service_areas: {
          areas_cliente: { id: realValues.length === 1 ? realValues[0] : { in: realValues } },
        },
      });
    }
  }

  // completed_day (booleano nullable)
  const completedDayValues = state.filters['completed_day'];
  if (completedDayValues?.length) {
    const boolVal = completedDayValues[0] === 'true';
    manualFilters.push({ completed_day: boolVal });
  }

  // completed_night (booleano nullable)
  const completedNightValues = state.filters['completed_night'];
  if (completedNightValues?.length) {
    const boolVal = completedNightValues[0] === 'true';
    manualFilters.push({ completed_night: boolVal });
  }

  // employees (M:M via dailyreportemployeerelations.employee_id)
  const employeeValues = state.filters['employees'];
  if (employeeValues?.length) {
    const hasNull = employeeValues.includes(NULL_FILTER_VALUE);
    const realValues = employeeValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({
        OR: [
          { dailyreportemployeerelations: { some: { employee_id: { in: realValues } } } },
          { dailyreportemployeerelations: { none: {} } },
        ],
      });
    } else if (hasNull) {
      manualFilters.push({ dailyreportemployeerelations: { none: {} } });
    } else {
      manualFilters.push({
        dailyreportemployeerelations: { some: { employee_id: { in: realValues } } },
      });
    }
  }

  // equipment (M:M mixto: vehicles via equipment_id + other_equipment via other_equipment_id)
  const equipmentValues = state.filters['equipment'];
  if (equipmentValues?.length) {
    const hasNull = equipmentValues.includes(NULL_FILTER_VALUE);
    const realValues = equipmentValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({
        OR: [
          { dailyreportequipmentrelations: { some: { equipment_id: { in: realValues } } } },
          { dailyreportequipmentrelations: { some: { other_equipment_id: { in: realValues } } } },
          { dailyreportequipmentrelations: { none: {} } },
        ],
      });
    } else if (hasNull) {
      manualFilters.push({ dailyreportequipmentrelations: { none: {} } });
    } else {
      manualFilters.push({
        OR: [
          { dailyreportequipmentrelations: { some: { equipment_id: { in: realValues } } } },
          { dailyreportequipmentrelations: { some: { other_equipment_id: { in: realValues } } } },
        ],
      });
    }
  }

  // customer_equipment (M:M via dailyreport_customer_equipment_relations.customer_equipment_id)
  const customerEquipmentValues = state.filters['customer_equipment'];
  if (customerEquipmentValues?.length) {
    const hasNull = customerEquipmentValues.includes(NULL_FILTER_VALUE);
    const realValues = customerEquipmentValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      manualFilters.push({
        OR: [
          { dailyreport_customer_equipment_relations: { some: { customer_equipment_id: { in: realValues } } } },
          { dailyreport_customer_equipment_relations: { none: {} } },
        ],
      });
    } else if (hasNull) {
      manualFilters.push({ dailyreport_customer_equipment_relations: { none: {} } });
    } else {
      manualFilters.push({
        dailyreport_customer_equipment_relations: {
          some: { customer_equipment_id: { in: realValues } },
        },
      });
    }
  }

  const base: Record<string, unknown> = {
    daily_report_id: dailyReportId,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
  };

  if (manualFilters.length > 0) {
    const existingAnd = (base.AND as Record<string, unknown>[] | undefined) ?? [];
    base.AND = [...existingAnd, ...manualFilters];
  }

  return base;
}

// ============================================================================
// SELECT COMÚN
// ============================================================================

/**
 * Construye el select de Prisma para las filas del parte.
 * reportDate se usa para filtrar employees_diagram por fecha.
 */
function buildRowSelect(reportDate?: string) {
  const day = reportDate ? Number(moment(reportDate).format('D')) : undefined;
  const month = reportDate ? Number(moment(reportDate).format('M')) : undefined;
  const year = reportDate ? Number(moment(reportDate).format('YYYY')) : undefined;

  return {
    id: true,
    daily_report_id: true,
    customer_id: true,
    service_id: true,
    item_id: true,
    start_time: true,
    end_time: true,
    description: true,
    status: true,
    working_day: true,
    document_path: true,
    sector_service_id: true,
    areas_service_id: true,
    remit_number: true,
    cancel_reason: true,
    type_service: true,
    completed_day: true,
    completed_night: true,
    preparte_id: true,
    last_comercial_edit_at: true,
    created_at: true,
    updated_at: true,
    // Relaciones directas
    customers: {
      select: { id: true, name: true },
    },
    customer_services: {
      select: { id: true, service_name: true },
    },
    service_items: {
      select: { id: true, item_name: true },
    },
    service_sectors: {
      select: {
        id: true,
        sectors: {
          select: { id: true, name: true },
        },
      },
    },
    service_areas: {
      select: {
        id: true,
        areas_cliente: {
          select: { id: true, descripcion_corta: true },
        },
      },
    },
    preparte: {
      select: { id: true },
    },
    // Relaciones de recursos
    dailyreportemployeerelations: {
      select: {
        id: true,
        role: true,
        employee_id: true,
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            file: true,
            // Diagrama del día del parte para detección de desviaciones
            employees_diagram:
              day != null && month != null && year != null
                ? {
                    where: {
                      day: day,
                      month: month,
                      year: year,
                    },
                    select: {
                      id: true,
                      diagram_type_employees_diagram_diagram_typeTodiagram_type: {
                        select: {
                          id: true,
                          name: true,
                          work_active: true,
                        },
                      },
                    },
                  }
                : false,
          },
        },
      },
    },
    dailyreportequipmentrelations: {
      select: {
        id: true,
        equipment_id: true,
        other_equipment_id: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            intern_number: true,
            condition: true,
            brand_vehicles: {
              select: { name: true },
            },
          },
        },
        other_equipment: {
          select: {
            id: true,
            intern_number: true,
            serial_number: true,
          },
        },
      },
    },
    dailyreport_customer_equipment_relations: {
      select: {
        id: true,
        customer_equipment_id: true,
        equipos_clientes: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    },
  } as const;
}

// ============================================================================
// 1. HEADER QUERY
// ============================================================================

/**
 * Obtiene la cabecera del parte diario (id, date, status).
 * Usado por el componente de encabezado de la página de detalle.
 */
export async function getDailyReportHeader(dailyReportId: string) {
  logger.debug('Obteniendo cabecera del parte diario', { data: { dailyReportId } });

  try {
    const data = await prisma.dailyreport.findUnique({
      where: { id: dailyReportId },
      select: {
        id: true,
        date: true,
        status: true,
        is_active: true,
        creation_date: true,
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener cabecera del parte diario', { data: { error, dailyReportId } });
    throw new Error('No se pudo obtener la cabecera del parte diario. Intente nuevamente.');
  }
}

export type DailyReportHeaderData = Awaited<ReturnType<typeof getDailyReportHeader>>;

// ============================================================================
// 2. PAGINATED QUERY
// ============================================================================

/**
 * Obtiene las filas del parte diario con paginación, filtros y ordenamiento.
 * Reemplaza las 4 queries Supabase + RPC del sistema anterior en una sola llamada Prisma.
 *
 * @param dailyReportId - ID del parte diario
 * @param searchParams - Parámetros de búsqueda/filtro/paginación del DataTable
 * @param reportDate - Fecha del parte (YYYY-MM-DD) para filtrar employees_diagram por día
 */
export async function getDailyReportDetailPaginated(
  dailyReportId: string,
  searchParams: DataTableSearchParams,
  reportDate?: string
) {
  logger.debug('Obteniendo filas del parte diario paginadas', {
    data: { dailyReportId, searchParams, reportDate },
  });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(dailyReportId, state);

    // Multi-sort con soporte para FK
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) {
        resolvedSorts.push(fkMapper(dir));
      } else if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: dir });
      }
    }

    // Orden por defecto: cliente, servicio, ítem
    const safeOrderBy =
      resolvedSorts.length > 0
        ? resolvedSorts
        : [
            { customers: { name: 'asc' as const } },
            { customer_services: { service_name: 'asc' as const } },
            { service_items: { item_name: 'asc' as const } },
          ];

    const rowSelect = buildRowSelect(reportDate);

    const [data, total] = await Promise.all([
      prisma.dailyreportrows.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: rowSelect,
      }),
      prisma.dailyreportrows.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener filas del parte diario paginadas', {
      data: { error, dailyReportId },
    });
    throw new Error('No se pudieron obtener las filas del parte diario. Intente nuevamente.');
  }
}

export type DailyReportDetailRow = Awaited<ReturnType<typeof getDailyReportDetailPaginated>>['data'][number];

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
    const where = buildWhereClause(dailyReportId, state);

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

// ============================================================================
// 4. SINGLE FACET (lazy-load con cross-filter)
// ============================================================================

/**
 * Retorna counts + opciones resueltas para UNA columna del filtro faceteado.
 * Implementa cross-filtering: excluye el filtro propio para mostrar
 * cuántos registros tendría cada opción si se cambiara solo ese filtro.
 *
 * Columnas soportadas: status, type_service, working_day, completed_day,
 * completed_night, customer, service, item, sector, area.
 */
export async function getDailyReportDetailSingleFacet(
  dailyReportId: string,
  columnId: string,
  searchParams?: DataTableSearchParams
) {
  logger.debug('Obteniendo facet del parte diario', { data: { dailyReportId, columnId } });

  // Helper para construir el mapa de facetas
  function toFacetMap(rows: { key: string | boolean | null | undefined; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      if (key == null) {
        map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        map.set(String(key), count);
      }
    }
    return map;
  }

  // Helper: WHERE con todos los filtros EXCEPTO el de la columna indicada
  function crossWhere(excludeColumn: string) {
    if (!searchParams || Object.keys(searchParams).length === 0) {
      return { daily_report_id: dailyReportId };
    }
    const parsedState = parseSearchParams(searchParams);
    // Eliminar el filtro propio de la columna
    delete parsedState.filters[excludeColumn];
    delete parsedState.filters[`${excludeColumn}_from`];
    delete parsedState.filters[`${excludeColumn}_to`];
    return buildWhereClause(dailyReportId, parsedState);
  }

  try {
    switch (columnId) {
      // ── Enums directos ────────────────────────────────────────────────────
      case 'status': {
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['status'],
          where: crossWhere('status'),
          _count: true,
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.status as string, count: r._count })));
        return { counts };
      }

      case 'type_service': {
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['type_service'],
          where: crossWhere('type_service'),
          _count: true,
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.type_service as string | null, count: r._count })));
        return { counts };
      }

      // ── Texto (working_day) ───────────────────────────────────────────────
      case 'working_day': {
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['working_day'],
          where: crossWhere('working_day'),
          _count: true,
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.working_day, count: r._count })));
        return { counts };
      }

      // ── Booleanos ─────────────────────────────────────────────────────────
      case 'completed_day': {
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['completed_day'],
          where: crossWhere('completed_day'),
          _count: true,
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.completed_day, count: r._count })));
        return { counts };
      }

      case 'completed_night': {
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['completed_night'],
          where: crossWhere('completed_night'),
          _count: true,
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.completed_night, count: r._count })));
        return { counts };
      }

      // ── FK → customer ─────────────────────────────────────────────────────
      case 'customer': {
        const baseWhere = crossWhere('customer');
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['customer_id'],
          where: baseWhere,
          _count: true,
        });

        // Resolver nombres de customers
        const customerIds = rows.map((r) => r.customer_id).filter((id): id is string => id != null);

        const customers = customerIds.length
          ? await prisma.customers.findMany({
              where: { id: { in: customerIds } },
              select: { id: true, name: true },
            })
          : [];

        const nameMap = new Map(customers.map((c) => [c.id, c.name]));

        const counts = toFacetMap(rows.map((r) => ({ key: r.customer_id, count: r._count })));

        const resolvedOptions = rows
          .filter((r) => r.customer_id != null)
          .map((r) => ({
            value: r.customer_id!,
            label: nameMap.get(r.customer_id!) ?? r.customer_id!,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        return { counts, resolvedOptions };
      }

      // ── FK → service ──────────────────────────────────────────────────────
      case 'service': {
        const baseWhere = crossWhere('service');
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['service_id'],
          where: baseWhere,
          _count: true,
        });

        const serviceIds = rows.map((r) => r.service_id).filter((id): id is string => id != null);

        const services = serviceIds.length
          ? await prisma.customer_services.findMany({
              where: { id: { in: serviceIds } },
              select: { id: true, service_name: true },
            })
          : [];

        const nameMap = new Map(services.map((s) => [s.id, s.service_name ?? s.id]));

        const counts = toFacetMap(rows.map((r) => ({ key: r.service_id, count: r._count })));

        const resolvedOptions = rows
          .filter((r) => r.service_id != null)
          .map((r) => ({
            value: r.service_id!,
            label: nameMap.get(r.service_id!) ?? r.service_id!,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        return { counts, resolvedOptions };
      }

      // ── FK → item ─────────────────────────────────────────────────────────
      case 'item': {
        const baseWhere = crossWhere('item');
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['item_id'],
          where: baseWhere,
          _count: true,
        });

        const itemIds = rows.map((r) => r.item_id).filter((id): id is string => id != null);

        const items = itemIds.length
          ? await prisma.service_items.findMany({
              where: { id: { in: itemIds } },
              select: { id: true, item_name: true },
            })
          : [];

        const nameMap = new Map(items.map((i) => [i.id, i.item_name]));

        const counts = toFacetMap(rows.map((r) => ({ key: r.item_id, count: r._count })));

        const resolvedOptions = rows
          .filter((r) => r.item_id != null)
          .map((r) => ({
            value: r.item_id!,
            label: nameMap.get(r.item_id!) ?? r.item_id!,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        return { counts, resolvedOptions };
      }

      // ── FK → sector (via sector_service_id → service_sectors → sectors) ──
      case 'sector': {
        const baseWhere = crossWhere('sector');
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['sector_service_id'],
          where: baseWhere,
          _count: true,
        });

        const sectorServiceIds = rows.map((r) => r.sector_service_id).filter((id): id is string => id != null);

        const serviceSectors = sectorServiceIds.length
          ? await prisma.service_sectors.findMany({
              where: { id: { in: sectorServiceIds } },
              select: {
                id: true,
                sectors: { select: { id: true, name: true } },
              },
            })
          : [];

        // Mapear: sector_service_id → sector real (id + name)
        const sectorMap = new Map(serviceSectors.map((ss) => [ss.id, ss.sectors]));

        const counts = toFacetMap(
          rows.map((r) => ({
            key: r.sector_service_id ? sectorMap.get(r.sector_service_id)?.id ?? r.sector_service_id : null,
            count: r._count,
          }))
        );

        const resolvedOptions = rows
          .filter((r) => r.sector_service_id != null)
          .map((r) => {
            const sector = sectorMap.get(r.sector_service_id!);
            return {
              value: sector?.id ?? r.sector_service_id!,
              label: sector?.name ?? r.sector_service_id!,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));

        return { counts, resolvedOptions };
      }

      // ── FK → area (via areas_service_id → service_areas → areas_cliente) ─
      case 'area': {
        const baseWhere = crossWhere('area');
        const rows = await prisma.dailyreportrows.groupBy({
          by: ['areas_service_id'],
          where: baseWhere,
          _count: true,
        });

        const areaServiceIds = rows.map((r) => r.areas_service_id).filter((id): id is string => id != null);

        const serviceAreas = areaServiceIds.length
          ? await prisma.service_areas.findMany({
              where: { id: { in: areaServiceIds } },
              select: {
                id: true,
                areas_cliente: { select: { id: true, descripcion_corta: true } },
              },
            })
          : [];

        // Mapear: areas_service_id → área real (id + descripcion_corta)
        const areaMap = new Map(serviceAreas.map((sa) => [sa.id, sa.areas_cliente]));

        const counts = toFacetMap(
          rows.map((r) => ({
            key: r.areas_service_id ? areaMap.get(r.areas_service_id)?.id ?? r.areas_service_id : null,
            count: r._count,
          }))
        );

        const resolvedOptions = rows
          .filter((r) => r.areas_service_id != null)
          .map((r) => {
            const area = areaMap.get(r.areas_service_id!);
            return {
              value: area?.id ?? r.areas_service_id!,
              label: area?.descripcion_corta ?? r.areas_service_id!,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));

        return { counts, resolvedOptions };
      }

      // ── M:M → employees ──────────────────────────────────────────────────
      case 'employees': {
        const where = crossWhere('employees');
        const rows = await prisma.dailyreportemployeerelations.groupBy({
          by: ['employee_id'],
          where: { dailyreportrows: where },
          _count: { _all: true },
        });

        // Registros sin empleados (none) — contar filas sin relaciones
        const rowsWithoutEmployees = await prisma.dailyreportrows.count({
          where: { ...where, dailyreportemployeerelations: { none: {} } },
        });

        const counts = toFacetMap(rows.map((r) => ({ key: r.employee_id, count: r._count._all })));
        if (rowsWithoutEmployees > 0) {
          counts.set(NULL_FILTER_VALUE, rowsWithoutEmployees);
        }

        const ids = rows.map((r) => r.employee_id).filter((id): id is string => id != null);
        const employees = ids.length
          ? await prisma.employees.findMany({
              where: { id: { in: ids } },
              select: { id: true, firstname: true, lastname: true, file: true },
              orderBy: [{ lastname: 'asc' }, { firstname: 'asc' }],
            })
          : [];

        const resolvedOptions = employees.map((e) => ({
          value: e.id,
          label: `[${e.file ?? '—'}] ${e.lastname ?? ''} ${e.firstname ?? ''}`.trim(),
        }));

        return { counts, resolvedOptions };
      }

      // ── M:M → equipment (vehicles + other_equipment) ─────────────────────
      case 'equipment': {
        const where = crossWhere('equipment');

        // Dos groupBys paralelos: equipment_id (vehicles) y other_equipment_id
        const [vehicleRows, otherRows] = await Promise.all([
          prisma.dailyreportequipmentrelations.groupBy({
            by: ['equipment_id'],
            where: { dailyreportrows: where, equipment_id: { not: null } },
            _count: { _all: true },
          }),
          prisma.dailyreportequipmentrelations.groupBy({
            by: ['other_equipment_id'],
            where: { dailyreportrows: where, other_equipment_id: { not: null } },
            _count: { _all: true },
          }),
        ]);

        // Combinar counts de ambos tipos en un solo Map
        const counts = new Map<string, number>();
        for (const r of vehicleRows) {
          if (r.equipment_id) counts.set(r.equipment_id, (counts.get(r.equipment_id) ?? 0) + r._count._all);
        }
        for (const r of otherRows) {
          if (r.other_equipment_id)
            counts.set(r.other_equipment_id, (counts.get(r.other_equipment_id) ?? 0) + r._count._all);
        }

        // Registros sin equipos — contar filas sin relaciones
        const rowsWithoutEquipment = await prisma.dailyreportrows.count({
          where: { ...where, dailyreportequipmentrelations: { none: {} } },
        });
        if (rowsWithoutEquipment > 0) {
          counts.set(NULL_FILTER_VALUE, rowsWithoutEquipment);
        }

        const vehicleIds = vehicleRows.map((r) => r.equipment_id).filter((id): id is string => id != null);
        const otherIds = otherRows.map((r) => r.other_equipment_id).filter((id): id is string => id != null);

        const [vehicles, otherEquipment] = await Promise.all([
          vehicleIds.length
            ? prisma.vehicles.findMany({
                where: { id: { in: vehicleIds } },
                select: { id: true, domain: true, intern_number: true },
                orderBy: { domain: 'asc' },
              })
            : [],
          otherIds.length
            ? prisma.other_equipment.findMany({
                where: { id: { in: otherIds } },
                select: { id: true, intern_number: true, serial_number: true },
                orderBy: { intern_number: 'asc' },
              })
            : [],
        ]);

        const resolvedOptions = [
          ...vehicles.map((v) => ({
            value: v.id,
            label: [v.domain, v.intern_number ? `(${v.intern_number})` : ''].filter(Boolean).join(' ').trim() || '—',
          })),
          ...otherEquipment.map((o) => ({
            value: o.id,
            label: [o.intern_number, o.serial_number].filter(Boolean).join(' / ') || '—',
          })),
        ];

        return { counts, resolvedOptions };
      }

      // ── M:M → customer_equipment ──────────────────────────────────────────
      case 'customer_equipment': {
        const where = crossWhere('customer_equipment');
        const rows = await prisma.dailyreport_customer_equipment_relations.groupBy({
          by: ['customer_equipment_id'],
          where: { dailyreportrows: where },
          _count: { _all: true },
        });

        // Registros sin equipo cliente — contar filas sin relaciones
        const rowsWithoutCustomerEquipment = await prisma.dailyreportrows.count({
          where: { ...where, dailyreport_customer_equipment_relations: { none: {} } },
        });

        const counts = toFacetMap(rows.map((r) => ({ key: r.customer_equipment_id, count: r._count._all })));
        if (rowsWithoutCustomerEquipment > 0) {
          counts.set(NULL_FILTER_VALUE, rowsWithoutCustomerEquipment);
        }

        const ids = rows.map((r) => r.customer_equipment_id).filter((id): id is string => id != null);
        const items = ids.length
          ? await prisma.equipos_clientes.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];

        const nameMap = new Map(items.map((i) => [i.id, i.name]));

        const resolvedOptions = rows
          .filter((r) => r.customer_equipment_id != null)
          .map((r) => ({
            value: r.customer_equipment_id!,
            label: nameMap.get(r.customer_equipment_id!) ?? r.customer_equipment_id!,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        return { counts, resolvedOptions };
      }

      default:
        logger.warn('columnId no soportado en getDailyReportDetailSingleFacet', {
          data: { columnId },
        });
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet del parte diario', {
      data: { error, dailyReportId, columnId },
    });
    return null;
  }
}

export type DailyReportDetailFacetResult = Awaited<ReturnType<typeof getDailyReportDetailSingleFacet>>;

// ============================================================================
// 5. HISTORY QUERY
// ============================================================================

/**
 * Obtiene el historial de cambios de una fila del parte diario.
 * Ordenado por created_at descendente (más reciente primero).
 */
export async function getDailyReportRowHistory(rowId: string) {
  logger.debug('Obteniendo historial de fila del parte diario', { data: { rowId } });

  try {
    const data = await prisma.dailyreportrows_history.findMany({
      where: { daily_report_row_id: rowId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        daily_report_row_id: true,
        related_table: true,
        related_id: true,
        action_type: true,
        changed_data: true,
        changed_fields: true,
        changed_by: true,
        created_at: true,
        metadata: true,
        reassignment_reason: true,
        users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener historial de fila del parte diario', {
      data: { error, rowId },
    });
    throw new Error('No se pudo obtener el historial de la fila. Intente nuevamente.');
  }
}

export type DailyReportHistoryEntry = Awaited<ReturnType<typeof getDailyReportRowHistory>>[number];

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

// ── Input types ──────────────────────────────────────────────────────────────

/** Un empleado con rol opcional (para jornadas 12/24 hrs) */
export interface EmployeeInput {
  id: string;
  role?: 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche';
}

/** Datos de una fila del parte diario para crear o actualizar */
export interface DailyReportRowInput {
  /** Requerido solo en create */
  daily_report_id?: string;
  customer_id: string;
  service_id: string;
  item_id: string;
  status: string;
  working_day: string;
  type_service?: 'mensual' | 'adicional' | 'adicional_permanente' | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  sector_service_id?: string | null;
  areas_service_id?: string | null;
  remit_number?: string | null;
  cancel_reason?: string | null;
  completed_day?: boolean | null;
  completed_night?: boolean | null;
  preparte_id?: string | null;
  employees?: EmployeeInput[];
  /** IDs de vehículos */
  equipment?: string[];
  /** IDs de otros equipos */
  other_equipment?: string[];
  /** IDs de equipos de clientes */
  customer_equipment?: string[];
}

/** Datos para edición masiva de filas */
export interface BulkRowUpdateData {
  status?: string;
  description?: string | null;
  /** Motivo de cancelación (requerido cuando status = 'cancelado') */
  cancel_reason?: string | null;
  /**
   * Fecha destino para reprogramación (YYYY-MM-DD).
   * Cuando se provee con status = 'reprogramado', se crean nuevas filas en esa fecha.
   */
  reschedule_date?: string | null;
  /**
   * Pseudo-estados que modifican completed_day / completed_night en lugar del status.
   * Se resuelven en bulkUpdateRowStatus y nunca se persisten como status.
   */
  completar_diurno?: boolean;
  completar_nocturno?: boolean;
}

// ── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Determina el status automático de una fila según si tiene recursos asignados.
 * Si el status enviado es uno de los terminales (ejecutado, cancelado, reprogramado,
 * en_certificacion) lo respeta; si no, calcula pendiente / sin_recursos_asignados.
 */
function resolveRowStatus(
  requestedStatus: string,
  hasResources: boolean
): 'pendiente' | 'sin_recursos_asignados' | 'ejecutado' | 'reprogramado' | 'cancelado' | 'en_certificacion' {
  const terminal = ['ejecutado', 'cancelado', 'reprogramado', 'en_certificacion'];
  if (terminal.includes(requestedStatus)) {
    return requestedStatus as 'ejecutado' | 'cancelado' | 'reprogramado' | 'en_certificacion';
  }
  return hasResources ? 'pendiente' : 'sin_recursos_asignados';
}

/**
 * Crea todas las relaciones (empleados, equipos, equipos de clientes)
 * de una fila dentro de una transacción existente.
 */
async function createRowRelations(
  tx: PrismaTransactionClient,
  rowId: string,
  employees: EmployeeInput[],
  equipment: string[],
  otherEquipment: string[],
  customerEquipment: string[]
): Promise<void> {
  // Empleados
  if (employees.length > 0) {
    await tx.dailyreportemployeerelations.createMany({
      data: employees.map((emp) => ({
        id: crypto.randomUUID(),
        daily_report_row_id: rowId,
        employee_id: emp.id,
        ...(emp.role ? { role: emp.role } : {}),
      })),
    });
  }

  // Vehículos + otros equipos (misma tabla, columnas distintas)
  const equipmentData: Array<{
    id: string;
    daily_report_row_id: string;
    equipment_id?: string;
    other_equipment_id?: string;
  }> = [
    ...equipment.map((eid) => ({
      id: crypto.randomUUID(),
      daily_report_row_id: rowId,
      equipment_id: eid,
    })),
    ...otherEquipment.map((oeid) => ({
      id: crypto.randomUUID(),
      daily_report_row_id: rowId,
      other_equipment_id: oeid,
    })),
  ];

  if (equipmentData.length > 0) {
    await tx.dailyreportequipmentrelations.createMany({ data: equipmentData });
  }

  // Equipos de clientes
  if (customerEquipment.length > 0) {
    await tx.dailyreport_customer_equipment_relations.createMany({
      data: customerEquipment.map((ceid) => ({
        id: crypto.randomUUID(),
        daily_report_row_id: rowId,
        customer_equipment_id: ceid,
      })),
    });
  }
}

// ============================================================================
// 6. CREATE ROW
// ============================================================================

/**
 * Crea una nueva fila del parte diario con todas sus relaciones de forma atómica.
 * Calcula el status automáticamente según los recursos asignados.
 */
export async function createDailyReportRowPrisma(data: DailyReportRowInput & { daily_report_id: string }) {
  logger.debug('Creando fila del parte diario', { data: { daily_report_id: data.daily_report_id } });

  const employees = data.employees ?? [];
  const equipment = data.equipment ?? [];
  const otherEquipment = data.other_equipment ?? [];
  const customerEquipment = data.customer_equipment ?? [];
  const hasResources = employees.length > 0 || equipment.length > 0 || otherEquipment.length > 0;
  const resolvedStatus = resolveRowStatus(data.status, hasResources);

  try {
    const row = await prisma.$transaction(async (tx) => {
      const newRow = await tx.dailyreportrows.create({
        data: {
          id: crypto.randomUUID(),
          daily_report_id: data.daily_report_id,
          customer_id: data.customer_id,
          service_id: data.service_id,
          item_id: data.item_id,
          status: resolvedStatus,
          working_day: data.working_day,
          type_service: data.type_service ?? null,
          start_time: data.start_time ? new Date(`1970-01-01T${data.start_time}`) : null,
          end_time: data.end_time ? new Date(`1970-01-01T${data.end_time}`) : null,
          description: data.description ?? null,
          sector_service_id: data.sector_service_id ?? null,
          areas_service_id: data.areas_service_id ?? null,
          remit_number: data.remit_number ?? null,
          cancel_reason: data.cancel_reason ?? null,
          completed_day: data.completed_day ?? null,
          completed_night: data.completed_night ?? null,
          preparte_id: data.preparte_id ?? null,
        },
      });

      await createRowRelations(tx, newRow.id, employees, equipment, otherEquipment, customerEquipment);

      return newRow;
    });

    return row;
  } catch (error) {
    logger.error('Error al crear fila del parte diario', { data: { error } });
    throw new Error('No se pudo crear la fila del parte diario. Intente nuevamente.');
  }
}

export type CreateDailyReportRowResult = Awaited<ReturnType<typeof createDailyReportRowPrisma>>;

// ============================================================================
// 7. UPDATE ROW
// ============================================================================

/**
 * Actualiza una fila existente del parte diario y sincroniza todas sus relaciones
 * de forma atómica (delete + re-create).
 */
export async function updateDailyReportRowPrisma(rowId: string, data: DailyReportRowInput) {
  logger.debug('Actualizando fila del parte diario', { data: { rowId } });

  const employees = data.employees ?? [];
  const equipment = data.equipment ?? [];
  const otherEquipment = data.other_equipment ?? [];
  const customerEquipment = data.customer_equipment ?? [];
  const hasResources = employees.length > 0 || equipment.length > 0 || otherEquipment.length > 0;
  const resolvedStatus = resolveRowStatus(data.status, hasResources);

  try {
    const row = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la fila principal
      const updatedRow = await tx.dailyreportrows.update({
        where: { id: rowId },
        data: {
          customer_id: data.customer_id,
          service_id: data.service_id,
          item_id: data.item_id,
          status: resolvedStatus,
          working_day: data.working_day,
          type_service: data.type_service ?? null,
          start_time: data.start_time ? new Date(`1970-01-01T${data.start_time}`) : null,
          end_time: data.end_time ? new Date(`1970-01-01T${data.end_time}`) : null,
          description: data.description ?? null,
          sector_service_id: data.sector_service_id ?? null,
          areas_service_id: data.areas_service_id ?? null,
          remit_number: data.remit_number ?? null,
          cancel_reason: data.cancel_reason ?? null,
          completed_day: data.completed_day ?? null,
          completed_night: data.completed_night ?? null,
          preparte_id: data.preparte_id ?? null,
        },
      });

      // 2. Borrar todas las relaciones existentes
      await Promise.all([
        tx.dailyreportemployeerelations.deleteMany({
          where: { daily_report_row_id: rowId },
        }),
        tx.dailyreportequipmentrelations.deleteMany({
          where: { daily_report_row_id: rowId },
        }),
        tx.dailyreport_customer_equipment_relations.deleteMany({
          where: { daily_report_row_id: rowId },
        }),
      ]);

      // 3. Re-crear relaciones desde los nuevos datos
      await createRowRelations(tx, rowId, employees, equipment, otherEquipment, customerEquipment);

      return updatedRow;
    });

    return row;
  } catch (error) {
    logger.error('Error al actualizar fila del parte diario', { data: { error, rowId } });
    throw new Error('No se pudo actualizar la fila del parte diario. Intente nuevamente.');
  }
}

export type UpdateDailyReportRowResult = Awaited<ReturnType<typeof updateDailyReportRowPrisma>>;

// ============================================================================
// 8. DELETE ROW
// ============================================================================

/**
 * Elimina una fila del parte diario.
 * Si la fila tenía un preparte vinculado, revierte su estado a 'pendiente'
 * y registra el cambio en el log de auditoría del preparte.
 * Las relaciones (empleados, equipos) se eliminan en cascada por la BD.
 */
export async function deleteDailyReportRowPrisma(rowId: string) {
  logger.debug('Eliminando fila del parte diario', { data: { rowId } });

  try {
    // 1. Leer la fila para verificar si tiene preparte vinculado
    const row = await prisma.dailyreportrows.findUnique({
      where: { id: rowId },
      select: {
        id: true,
        preparte_id: true,
        preparte: {
          select: { id: true, numero_pedido: true, status: true },
        },
      },
    });

    if (!row) {
      throw new Error('La fila no existe');
    }

    // 2. Eliminar la fila (cascade elimina relaciones en BD)
    await prisma.dailyreportrows.delete({ where: { id: rowId } });

    // 3. Si tenía preparte vinculado, revertir su estado a pendiente
    if (row.preparte_id && row.preparte) {
      const { updatePreparte, logPreparteChange } = await import('@/features/Operaciones/Preparte/actions/preparte');

      await updatePreparte(row.preparte_id, { status: 'pendiente' });
      await logPreparteChange({
        preparte_id: row.preparte_id,
        field_name: 'status',
        old_value: row.preparte.status ?? 'confirmado',
        new_value: 'pendiente',
        reason: 'La línea del parte diario fue eliminada manualmente',
        metadata: { daily_report_row_id: rowId, action: 'daily_report_row_deleted' },
      });

      return {
        success: true,
        revertedPreparte: { numero_pedido: row.preparte.numero_pedido },
      };
    }

    return { success: true, revertedPreparte: null };
  } catch (error) {
    logger.error('Error al eliminar fila del parte diario', { data: { error, rowId } });
    throw new Error('No se pudo eliminar la fila del parte diario. Intente nuevamente.');
  }
}

export type DeleteDailyReportRowResult = Awaited<ReturnType<typeof deleteDailyReportRowPrisma>>;

// ============================================================================
// 9. BULK UPDATE ROW STATUS
// ============================================================================

/**
 * Actualiza múltiples filas del parte diario a la vez.
 * Útil para el modal de edición masiva (BulkEditModal).
 */
export async function bulkUpdateRowStatus(rowIds: string[], data: BulkRowUpdateData) {
  logger.debug('Actualizando múltiples filas del parte diario', {
    data: { count: rowIds.length, fields: Object.keys(data) },
  });

  if (rowIds.length === 0) {
    return { count: 0 };
  }

  try {
    // ── Completar diurno: setea completed_day=true; si la noche ya estaba ────
    //    completa, promueve el status a 'ejecutado' (replicado de prod).
    if (data.completar_diurno || data.completar_nocturno) {
      const completandoDiurno = !!data.completar_diurno;
      const completandoNocturno = !!data.completar_nocturno;

      // Leer estado actual de cada fila para decidir promoción
      const currentRows = await prisma.dailyreportrows.findMany({
        where: { id: { in: rowIds } },
        select: { id: true, completed_day: true, completed_night: true, status: true },
      });

      const updates = currentRows.map((row) => {
        const newCompletedDay = completandoDiurno ? true : row.completed_day;
        const newCompletedNight = completandoNocturno ? true : row.completed_night;
        const bothComplete = newCompletedDay === true && newCompletedNight === true;

        const updateData: Record<string, unknown> = {};
        if (completandoDiurno) updateData.completed_day = true;
        if (completandoNocturno) updateData.completed_night = true;
        if (bothComplete) updateData.status = 'ejecutado';

        return prisma.dailyreportrows.update({
          where: { id: row.id },
          data: updateData,
        });
      });

      await prisma.$transaction(updates);
      return { count: currentRows.length };
    }

    // ── Reprogramado con fecha: clonar filas a destino + marcar origen ────────
    if (data.status === 'reprogramado' && data.reschedule_date) {
      await cloneDailyReportRows(rowIds, [data.reschedule_date], {
        includeEmployees: false,
        includeEquipment: false,
      });
      await prisma.dailyreportrows.updateMany({
        where: { id: { in: rowIds } },
        data: { status: 'reprogramado' },
      });
      return { count: rowIds.length };
    }

    // ── Actualización normal ─────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {};
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.cancel_reason !== undefined) updatePayload.cancel_reason = data.cancel_reason;

    const result = await prisma.dailyreportrows.updateMany({
      where: { id: { in: rowIds } },
      data: updatePayload,
    });

    return { count: result.count };
  } catch (error) {
    logger.error('Error al actualizar múltiples filas del parte diario', {
      data: { error, rowIds },
    });
    throw new Error('No se pudieron actualizar las filas del parte diario. Intente nuevamente.');
  }
}

export type BulkUpdateRowStatusResult = Awaited<ReturnType<typeof bulkUpdateRowStatus>>;

// ============================================================================
// 10. CLONE ROWS
// ============================================================================

/**
 * Datos mínimos de una fila para clonar (los campos que se copian).
 * El resto (id, created_at, etc.) se regenera.
 */
interface RowToClone {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  item_id: string | null;
  working_day: string | null;
  start_time: Date | null;
  end_time: Date | null;
  description: string | null;
  areas_service_id: string | null;
  sector_service_id: string | null;
  type_service: 'mensual' | 'adicional' | 'adicional_permanente' | null;
  /** Empleados a copiar (si trasladarPersonal = true) */
  dailyreportemployeerelations?: Array<{
    employee_id: string | null;
    role: 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche' | null;
  }>;
  /** Equipos (vehículos + otros) a copiar (si trasladarEquipos = true) */
  dailyreportequipmentrelations?: Array<{
    equipment_id: string | null;
    other_equipment_id: string | null;
  }>;
  /** Equipos de clientes — siempre se copian */
  dailyreport_customer_equipment_relations?: Array<{
    customer_equipment_id: string;
  }>;
}

export interface CloneRowsOptions {
  /** Si true, copia empleados activos de las filas originales */
  includeEmployees?: boolean;
  /** Si true, copia equipos (vehículos + otros) de las filas originales */
  includeEquipment?: boolean;
  /**
   * Si se provee y rowIds está vacío, clona TODAS las filas del parte indicado.
   * Permite el flujo "Clonar todo el parte" sin selección previa.
   */
  cloneAllFromReportId?: string;
  /**
   * Filtro opcional de tipos de servicio a incluir (solo aplica en modo "clonar todo").
   * Si no se provee, se incluyen todos los tipos.
   */
  typeServiceFilter?: Array<'mensual' | 'adicional' | 'adicional_permanente'>;
}

/**
 * Clona filas seleccionadas a una o más fechas destino.
 *
 * Para cada fecha:
 * 1. Verifica si ya existe un `dailyreport` para esa fecha; si no, lo crea.
 * 2. Crea una copia de cada fila (con relaciones según opciones) dentro del
 *    parte correspondiente, en una transacción por fecha.
 *
 * Lógica de status: si se copian empleados o equipos → 'pendiente',
 * si no → 'sin_recursos_asignados' (misma regla que ClonarRegistrosButton).
 */
export async function cloneDailyReportRows(rowIds: string[], targetDates: string[], options: CloneRowsOptions = {}) {
  logger.debug('Clonando filas del parte diario', {
    data: { rowCount: rowIds.length, dateCount: targetDates.length },
  });

  if (targetDates.length === 0) {
    return { createdReportIds: [], clonedRowCount: 0 };
  }

  // Modo "clonar todo": si rowIds está vacío pero se proporcionó un dailyReportId,
  // buscar todas las filas activas del parte (con filtro opcional por tipo de servicio)
  let resolvedRowIds = rowIds;
  if (rowIds.length === 0) {
    if (!options.cloneAllFromReportId) {
      return { createdReportIds: [], clonedRowCount: 0 };
    }
    const allRows = await prisma.dailyreportrows.findMany({
      where: {
        daily_report_id: options.cloneAllFromReportId,
        ...(options.typeServiceFilter?.length ? { type_service: { in: options.typeServiceFilter } } : {}),
      },
      select: { id: true },
    });
    resolvedRowIds = allRows.map((r) => r.id);
    if (resolvedRowIds.length === 0) {
      return { createdReportIds: [], clonedRowCount: 0 };
    }
  }

  const { includeEmployees = false, includeEquipment = false } = options;

  try {
    // 1. Cargar las filas originales con sus relaciones
    const originalRows = await prisma.dailyreportrows.findMany({
      where: { id: { in: resolvedRowIds } },
      select: {
        id: true,
        customer_id: true,
        service_id: true,
        item_id: true,
        working_day: true,
        start_time: true,
        end_time: true,
        description: true,
        areas_service_id: true,
        sector_service_id: true,
        type_service: true,
        dailyreportemployeerelations: {
          select: {
            employee_id: true,
            role: true,
            employees: { select: { is_active: true } },
          },
        },
        dailyreportequipmentrelations: {
          select: {
            equipment_id: true,
            other_equipment_id: true,
          },
        },
        dailyreport_customer_equipment_relations: {
          select: { customer_equipment_id: true },
        },
      },
    });

    if (originalRows.length === 0) {
      throw new Error('No se encontraron las filas a clonar');
    }

    // 2. Obtener company_id desde la cookie (necesario para crear dailyreport headers)
    const { cookies } = await import('next/headers');
    const { getCompanyId } = await import('@/lib/company-config');
    const cookieStore = await cookies();
    const companyId = getCompanyId(cookieStore.get('actualComp')?.value);

    // 3. Verificar qué fechas ya tienen un dailyreport
    const existingReports = await prisma.dailyreport.findMany({
      where: {
        date: { in: targetDates.map((d) => new Date(d)) },
        company_id: companyId,
      },
      select: { id: true, date: true },
    });

    const existingByDate = new Map(existingReports.map((r) => [moment(r.date).format('YYYY-MM-DD'), r]));

    const createdReportIds: string[] = [];
    const allReportIds: string[] = [];
    let totalCloned = 0;

    // 4. Para cada fecha destino, crear el header si falta y clonar las filas
    for (const targetDate of targetDates) {
      let report = existingByDate.get(targetDate);

      if (!report) {
        // Crear el parte diario para esta fecha
        report = await prisma.dailyreport.create({
          data: {
            id: crypto.randomUUID(),
            date: new Date(targetDate),
            company_id: companyId,
          },
          select: { id: true, date: true },
        });
        createdReportIds.push(report.id);
      }

      allReportIds.push(report.id);

      const targetReportId = report.id;

      // Clonar todas las filas para esta fecha en una transacción
      await prisma.$transaction(async (tx) => {
        for (const originalRow of originalRows) {
          // Determinar empleados a copiar (solo activos)
          const employeesToCopy: EmployeeInput[] = includeEmployees
            ? originalRow.dailyreportemployeerelations
                .filter((rel) => rel.employee_id != null && rel.employees?.is_active !== false)
                .map((rel) => ({
                  id: rel.employee_id!,
                  ...(rel.role ? { role: rel.role } : {}),
                }))
            : [];

          // Determinar equipos a copiar
          const vehiclesToCopy = includeEquipment
            ? originalRow.dailyreportequipmentrelations
                .filter((rel) => rel.equipment_id != null)
                .map((rel) => rel.equipment_id!)
            : [];

          const otherEquipmentToCopy = includeEquipment
            ? originalRow.dailyreportequipmentrelations
                .filter((rel) => rel.other_equipment_id != null)
                .map((rel) => rel.other_equipment_id!)
            : [];

          // Equipos de clientes — siempre se copian (comportamiento de ClonarRegistrosButton)
          const customerEquipmentToCopy = originalRow.dailyreport_customer_equipment_relations.map(
            (rel) => rel.customer_equipment_id
          );

          const hasResources =
            employeesToCopy.length > 0 || vehiclesToCopy.length > 0 || otherEquipmentToCopy.length > 0;
          const newStatus: 'pendiente' | 'sin_recursos_asignados' = hasResources
            ? 'pendiente'
            : 'sin_recursos_asignados';

          const newRowId = crypto.randomUUID();

          await tx.dailyreportrows.create({
            data: {
              id: newRowId,
              daily_report_id: targetReportId,
              customer_id: originalRow.customer_id,
              service_id: originalRow.service_id,
              item_id: originalRow.item_id,
              working_day: originalRow.working_day,
              start_time: originalRow.start_time,
              end_time: originalRow.end_time,
              description: originalRow.description,
              areas_service_id: originalRow.areas_service_id,
              sector_service_id: originalRow.sector_service_id,
              type_service: originalRow.type_service,
              status: newStatus,
            },
          });

          await createRowRelations(
            tx,
            newRowId,
            employeesToCopy,
            vehiclesToCopy,
            otherEquipmentToCopy,
            customerEquipmentToCopy
          );

          totalCloned++;
        }
      });
    }

    return {
      createdReportIds,
      allReportIds,
      clonedRowCount: totalCloned,
    };
  } catch (error) {
    logger.error('Error al clonar filas del parte diario', { data: { error } });
    throw new Error('No se pudieron clonar las filas del parte diario. Intente nuevamente.');
  }
}

export type CloneDailyReportRowsResult = Awaited<ReturnType<typeof cloneDailyReportRows>>;

// ============================================================================
// 10b. TYPE SERVICE SUMMARY (para CloneRowsDialog)
// ============================================================================

/**
 * Retorna la cantidad de filas por tipo de servicio de un parte diario.
 * Usado por CloneRowsDialog para saber qué checkboxes de tipo habilitar.
 */
export async function getDailyReportTypeServiceSummary(dailyReportId: string) {
  logger.debug('Obteniendo resumen de tipos de servicio', { data: { dailyReportId } });

  try {
    const rows = await prisma.dailyreportrows.groupBy({
      by: ['type_service'],
      where: { daily_report_id: dailyReportId },
      _count: true,
    });

    const summary: Record<string, number> = {};
    for (const row of rows) {
      const key = row.type_service ?? 'null';
      summary[key] = row._count;
    }

    return summary;
  } catch (error) {
    logger.error('Error al obtener resumen de tipos de servicio', { data: { error, dailyReportId } });
    return {};
  }
}

export type DailyReportTypeServiceSummary = Awaited<ReturnType<typeof getDailyReportTypeServiceSummary>>;

// ============================================================================
// 11. FORM DATA — customers, services, items, sectors, areas, equipment
// ============================================================================

/**
 * Returns all active customers with their services, items, sectors, areas,
 * and customer equipment — used to populate the DailyReportRowForm.
 */
export async function getCustomersForForm() {
  logger.debug('Obteniendo clientes para el formulario de parte diario');

  try {
    const data = await prisma.customers.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        is_active: true,
        equipos_clientes: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        customer_services: {
          where: { is_active: true },
          select: {
            id: true,
            service_name: true,
            is_active: true,
            service_validity: true,
            service_items: {
              where: { is_active: true },
              select: {
                id: true,
                item_name: true,
                is_active: true,
                needs_personnel: true,
                needs_equipment: true,
                measure_units: {
                  select: { id: true, unit: true },
                },
              },
            },
            service_sectors: {
              select: {
                id: true,
                service_id: true,
                sectors: {
                  select: { id: true, name: true, descripcion_corta: true },
                },
              },
            },
            service_areas: {
              select: {
                id: true,
                service_id: true,
                areas_cliente: {
                  select: { id: true, nombre: true, descripcion_corta: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener clientes para el formulario', { data: { error } });
    throw new Error('No se pudieron obtener los clientes. Intente nuevamente.');
  }
}

export type CustomersForForm = Awaited<ReturnType<typeof getCustomersForForm>>;
export type CustomerForForm = CustomersForForm[number];

/**
 * Returns a single row by id to pre-populate the edit form.
 * Includes all relations needed (employees with roles, equipment, customer equipment).
 */
export async function getDailyReportRowForForm(rowId: string) {
  logger.debug('Obteniendo fila del parte para el formulario', { data: { rowId } });

  try {
    const row = await prisma.dailyreportrows.findUnique({
      where: { id: rowId },
      select: {
        id: true,
        customer_id: true,
        service_id: true,
        item_id: true,
        status: true,
        working_day: true,
        start_time: true,
        end_time: true,
        description: true,
        document_path: true,
        sector_service_id: true,
        areas_service_id: true,
        remit_number: true,
        cancel_reason: true,
        type_service: true,
        completed_day: true,
        completed_night: true,
        preparte_id: true,
        dailyreportemployeerelations: {
          select: {
            id: true,
            employee_id: true,
            role: true,
          },
        },
        dailyreportequipmentrelations: {
          select: {
            id: true,
            equipment_id: true,
            other_equipment_id: true,
          },
        },
        dailyreport_customer_equipment_relations: {
          select: {
            id: true,
            customer_equipment_id: true,
          },
        },
      },
    });

    return row;
  } catch (error) {
    logger.error('Error al obtener fila del parte para el formulario', { data: { error, rowId } });
    throw new Error('No se pudo obtener la fila. Intente nuevamente.');
  }
}

export type DailyReportRowForForm = Awaited<ReturnType<typeof getDailyReportRowForForm>>;

/**
 * Returns all active employees for the daily report form,
 * including contractor assignments (to detect if they are assigned to a customer).
 */
export async function getEmployeesForForm(reportDate?: string) {
  logger.debug('Obteniendo empleados para el formulario de parte diario');

  try {
    const dateToCheck = reportDate ? new Date(reportDate) : new Date();
    const day = dateToCheck.getDate();
    const month = dateToCheck.getMonth() + 1;
    const year = dateToCheck.getFullYear();

    const data = await prisma.employees.findMany({
      where: { is_active: true },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        file: true,
        contractor_employee: {
          select: {
            customers: {
              select: { id: true, name: true },
            },
          },
        },
        company_positions: {
          select: { id: true, name: true },
        },
        employees_diagram: {
          where: { day, month, year },
          select: {
            id: true,
            diagram_type_employees_diagram_diagram_typeTodiagram_type: {
              select: { id: true, name: true, work_active: true },
            },
          },
        },
      },
      orderBy: [{ lastname: 'asc' }, { firstname: 'asc' }],
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener empleados para el formulario', { data: { error } });
    throw new Error('No se pudieron obtener los empleados. Intente nuevamente.');
  }
}

export type EmployeesForForm = Awaited<ReturnType<typeof getEmployeesForForm>>;
export type EmployeeForForm = EmployeesForForm[number];

/**
 * Returns all active vehicles (equipos propios) for the daily report form,
 * including contractor assignments and condition info.
 */
export async function getVehiclesForForm() {
  logger.debug('Obteniendo vehículos para el formulario de parte diario');

  try {
    const data = await prisma.vehicles.findMany({
      where: { is_active: true },
      select: {
        id: true,
        domain: true,
        serie: true,
        condition: true,
        intern_number: true,
        brand_vehicles: {
          select: { name: true },
        },
        type: true,
        type_vehicles_typeTotype: {
          select: { id: true, name: true },
        },
        contractor_equipment: {
          select: {
            customers: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { domain: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener vehículos para el formulario', { data: { error } });
    throw new Error('No se pudieron obtener los vehículos. Intente nuevamente.');
  }
}

export type VehiclesForForm = Awaited<ReturnType<typeof getVehiclesForForm>>;
export type VehicleForForm = VehiclesForForm[number];

/**
 * Returns all operative other equipment for the daily report form.
 */
export async function getOtherEquipmentForForm() {
  logger.debug('Obteniendo otros equipos para el formulario de parte diario');

  try {
    const data = await prisma.other_equipment.findMany({
      where: { condition: 'operativo' },
      select: {
        id: true,
        intern_number: true,
        serial_number: true,
        condition: true,
        type: {
          select: { id: true, name: true },
        },
        contractor_other_equipment: {
          select: {
            customers: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { intern_number: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener otros equipos para el formulario', { data: { error } });
    throw new Error('No se pudieron obtener los otros equipos. Intente nuevamente.');
  }
}

export type OtherEquipmentForForm = Awaited<ReturnType<typeof getOtherEquipmentForForm>>;
export type OtherEquipmentItem = OtherEquipmentForForm[number];

// ============================================================================
// 15. ROW DETAIL (on-demand — ServiceDetailDialog)
// ============================================================================

/**
 * Fetches full detail data for a single row, including enriched employee/equipment info.
 * Used by ServiceDetailDialog to show DNI, email, phone, position, brand, model, etc.
 * This is fetched on-demand (not in the paginated query) to avoid bloating the main payload.
 */
export async function getDailyReportRowDetail(rowId: string) {
  logger.debug('Obteniendo detalle enriquecido de fila del parte diario', { data: { rowId } });

  try {
    const row = await prisma.dailyreportrows.findUnique({
      where: { id: rowId },
      select: {
        id: true,
        customer_id: true,
        service_id: true,
        item_id: true,
        description: true,
        status: true,
        working_day: true,
        start_time: true,
        end_time: true,
        remit_number: true,
        cancel_reason: true,
        type_service: true,
        completed_day: true,
        completed_night: true,
        last_comercial_edit_at: true,
        customers: {
          select: { id: true, name: true },
        },
        customer_services: {
          select: { id: true, service_name: true },
        },
        service_items: {
          select: { id: true, item_name: true, item_description: true },
        },
        service_sectors: {
          select: {
            id: true,
            sectors: { select: { id: true, name: true } },
          },
        },
        service_areas: {
          select: {
            id: true,
            areas_cliente: { select: { id: true, descripcion_corta: true } },
          },
        },
        preparte: {
          select: { id: true, numero_pedido: true },
        },
        dailyreportemployeerelations: {
          select: {
            id: true,
            employee_id: true,
            role: true,
            employees: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                file: true,
                cuil: true,
                email: true,
                phone: true,
                hierarchy: { select: { name: true } },
              },
            },
          },
        },
        dailyreportequipmentrelations: {
          select: {
            id: true,
            equipment_id: true,
            other_equipment_id: true,
            vehicles: {
              select: {
                id: true,
                domain: true,
                intern_number: true,
                year: true,
                condition: true,
                brand_vehicles: { select: { name: true } },
                model_vehicles: { select: { name: true } },
                types_of_vehicles: { select: { name: true } },
              },
            },
            other_equipment: {
              select: {
                id: true,
                intern_number: true,
                serial_number: true,
              },
            },
          },
        },
        dailyreport_customer_equipment_relations: {
          select: {
            id: true,
            customer_equipment_id: true,
            equipos_clientes: {
              select: { name: true, type: true },
            },
          },
        },
      },
    });

    return row;
  } catch (error) {
    logger.error('Error al obtener detalle de fila del parte diario', { data: { error, rowId } });
    throw new Error('No se pudo obtener el detalle de la fila. Intente nuevamente.');
  }
}

export type DailyReportRowDetailData = Awaited<ReturnType<typeof getDailyReportRowDetail>>;
