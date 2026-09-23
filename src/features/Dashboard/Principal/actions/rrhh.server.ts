'use server';

import { Prisma } from '@/generated/prisma/client';
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
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { getOperationToday, getTodayParts } from '../lib/dashboard-dates';
import { aggregateDiagramIndicators, percentage } from '../lib/indicators';
import { mapEmployeesNotInReport, toFacetMap, type EmployeeDiagramRow } from '../lib/row-mapping';
import type { DiagramIndicatorResult, EmployeeIndicatorResult, EmployeeNotInReportResult } from './types';

const logger = new Logger('features/Dashboard/Principal/rrhh');

/**
 * Personal del dashboard principal: indicador de uso, distribución por diagrama, empleados
 * fuera del parte y la tabla paginada del diálogo de disponibles.
 *
 * Perímetro: la empresa sale de `getActiveCompanyId()`. Los `positionIds` que manda el
 * cliente sólo acotan el listado; además se filtran contra los puestos de la empresa antes
 * de usarlos en SQL (ver `sanitizePositionIds`).
 */

const DEFAULT_EMPLOYEE_INDICATOR: EmployeeIndicatorResult = {
  employees_operativos: 0,
  employees_used: 0,
  indicator: 0,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deja sólo los `positionIds` que son uuid válidos.
 *
 * Los ids entran a una consulta SQL cruda (`buildAvailableEmployeesWhere`): antes se
 * interpolaban como texto dentro del SQL con `$queryRawUnsafe`, o sea una inyección
 * directa desde el cliente. Ahora van bindeados, y esto es el cinturón extra.
 */
function sanitizePositionIds(positionIds?: string[]): string[] {
  return (positionIds ?? []).filter((id) => UUID_RE.test(id));
}

function positionFilter(positionIds: readonly string[]) {
  return positionIds.length > 0 ? { company_position: { in: [...positionIds] } } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Indicadores
// ─────────────────────────────────────────────────────────────────────────────

/** Indicador de uso de personal: operativos (con diagrama de trabajo hoy) vs. usados en el parte. */
export async function getEmployeeIndicators(positionIds?: string[]): Promise<EmployeeIndicatorResult> {
  logger.debug('Obteniendo indicadores de empleados', { data: { positionIds } });

  try {
    const companyId = await getActiveCompanyId();
    const { day, month, year } = getTodayParts();
    const todayDate = getOperationToday();
    const positions = sanitizePositionIds(positionIds);

    const [operativeDiagrams, usedRelations] = await Promise.all([
      prisma.employees_diagram.findMany({
        where: {
          day,
          month,
          year,
          diagram_type_employees_diagram_diagram_typeTodiagram_type: { work_active: true, is_active: true },
          employees: withCompany({ is_active: true, ...positionFilter(positions) }, companyId),
        },
        select: { employee_id: true },
        distinct: ['employee_id'],
      }),
      prisma.dailyreportemployeerelations.findMany({
        where: {
          employee_id: { not: null },
          dailyreportrows: {
            dailyreport: { date: new Date(todayDate), is_active: true, company_id: companyId },
          },
          employees: { is_active: true, ...positionFilter(positions) },
        },
        select: { employee_id: true },
        distinct: ['employee_id'],
      }),
    ]);

    const employeesOperativos = operativeDiagrams.length;
    const employeesUsed = usedRelations.length;

    return {
      employees_operativos: employeesOperativos,
      employees_used: employeesUsed,
      indicator: percentage(employeesUsed, employeesOperativos),
    };
  } catch (error) {
    logger.error('Error al obtener indicadores de empleados', { data: { error } });
    return DEFAULT_EMPLOYEE_INDICATOR;
  }
}

/** Cantidad de empleados por tipo de diagrama para el día de hoy. */
export async function getDiagramIndicators(positionIds?: string[]): Promise<DiagramIndicatorResult[]> {
  logger.debug('Obteniendo indicadores de diagramas', { data: { positionIds } });

  try {
    const companyId = await getActiveCompanyId();
    const { day, month, year } = getTodayParts();
    const positions = sanitizePositionIds(positionIds);
    const employeesWhere = withCompany({ is_active: true, ...positionFilter(positions) }, companyId);

    const [diagrams, totalActiveEmployees] = await Promise.all([
      prisma.employees_diagram.findMany({
        where: {
          day,
          month,
          year,
          employees: employeesWhere,
          diagram_type_employees_diagram_diagram_typeTodiagram_type: { is_active: true },
        },
        select: {
          employee_id: true,
          diagram_type: true,
          diagram_type_employees_diagram_diagram_typeTodiagram_type: { select: { name: true, color: true } },
        },
      }),
      prisma.employees.count({ where: employeesWhere }),
    ]);

    return aggregateDiagramIndicators(diagrams, totalActiveEmployees);
  } catch (error) {
    logger.error('Error al obtener indicadores de diagramas', { data: { error } });
    return [];
  }
}

/** Empleados con diagrama de trabajo activo hoy que no están en el parte diario. */
export async function getEmployeesNotInDailyReport(positionIds?: string[]): Promise<EmployeeNotInReportResult[]> {
  logger.debug('Obteniendo empleados fuera del parte diario', { data: { positionIds } });

  try {
    const companyId = await getActiveCompanyId();
    const { day, month, year } = getTodayParts();
    const todayDate = getOperationToday();
    const positions = sanitizePositionIds(positionIds);

    const employeesInReport = await prisma.dailyreportemployeerelations.findMany({
      where: {
        employee_id: { not: null },
        dailyreportrows: {
          dailyreport: { date: new Date(todayDate), is_active: true, company_id: companyId },
        },
        employees: { is_active: true, ...positionFilter(positions) },
      },
      select: { employee_id: true },
      distinct: ['employee_id'],
    });

    const inReportIds = employeesInReport.map((row) => row.employee_id).filter((id): id is string => id != null);

    const diagrams = await prisma.employees_diagram.findMany({
      where: {
        day,
        month,
        year,
        diagram_type_employees_diagram_diagram_typeTodiagram_type: { work_active: true, is_active: true },
        employees: withCompany(
          {
            is_active: true,
            ...positionFilter(positions),
            ...(inReportIds.length > 0 ? { id: { notIn: inReportIds } } : {}),
          },
          companyId
        ),
      },
      select: {
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            cuil: true,
            file: true,
            company_positions: { select: { name: true } },
            contractor_employee: { select: { customers: { select: { name: true } } } },
          },
        },
        diagram_type_employees_diagram_diagram_typeTodiagram_type: {
          select: { short_description: true, color: true },
        },
      },
      orderBy: { employees: { lastname: 'asc' } },
    });

    return mapEmployeesNotInReport(diagrams as EmployeeDiagramRow[]);
  } catch (error) {
    logger.error('Error al obtener empleados fuera del parte', { data: { error } });
    return [];
  }
}

export type EmployeesNotInDailyReportData = Awaited<ReturnType<typeof getEmployeesNotInDailyReport>>;

/**
 * Puestos de la empresa activa, para el filtro del tablero.
 *
 * Perímetro: `company_positions` tiene `company_id`; antes se devolvían los puestos de
 * TODAS las empresas, que además son los valores que el filtro manda de vuelta.
 */
export async function getAllPositions() {
  logger.debug('Obteniendo todas las posiciones');

  try {
    const companyId = await getActiveCompanyId();

    return await prisma.company_positions.findMany({
      where: withCompany({}, companyId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener posiciones', { data: { error } });
    throw error;
  }
}

export type AllPositionsData = Awaited<ReturnType<typeof getAllPositions>>;
export type PositionItem = AllPositionsData[number];

// ─────────────────────────────────────────────────────────────────────────────
// Diálogo de empleados disponibles — DataTable server-side
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_COLUMNS = ['file', 'cuil'];
const COLUMN_MAP: Record<string, string> = { company_positions: 'company_position' };
const VALID_SORT_FIELDS = new Set(['lastname', 'firstname', 'cuil', 'file', 'company_positions']);
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  company_positions: (dir) => ({ company_positions: { name: dir } }),
};

/**
 * Select de empleados disponibles.
 *
 * El diagrama anidado se filtra por la fecha de HOY: sin ese filtro la relación devuelve
 * cualquier diagrama activo del historial del empleado (`take: 1` sin orden), y las
 * columnas "Diagrama" y "Comentario" terminan mostrando una novedad de otro día.
 */
function buildAvailableEmployeeSelect() {
  const { day, month, year } = getTodayParts();

  return {
    id: true,
    firstname: true,
    lastname: true,
    cuil: true,
    file: true,
    company_position: true,
    company_positions: { select: { id: true, name: true } },
    contractor_employee: { select: { contractor_id: true, customers: { select: { id: true, name: true } } } },
    employees_diagram: {
      select: {
        diagram_type: true,
        comments: true,
        diagram_type_employees_diagram_diagram_typeTodiagram_type: {
          select: { short_description: true, color: true },
        },
      },
      where: {
        day,
        month,
        year,
        diagram_type_employees_diagram_diagram_typeTodiagram_type: { work_active: true, is_active: true },
      },
      take: 1,
    },
  } as const;
}

/**
 * Ids de los empleados "disponibles" hoy, calculados en la base.
 *
 * Replica la aritmética del indicador: disponibles = operativos − TODOS los que están en
 * el parte, de ahí el `LIMIT` con la resta de los dos conteos.
 *
 * `positionIds` va BINDEADO como `uuid[]`; antes se concatenaba dentro del texto del SQL
 * con `$queryRawUnsafe`.
 */
async function getAvailableEmployeeIds(
  companyId: string,
  positionIds: readonly string[],
  todayDate: string,
  day: number,
  month: number,
  year: number
): Promise<string[]> {
  const hasPositions = positionIds.length > 0;
  const positionArray = [...positionIds];

  const operativePositionClause = hasPositions
    ? Prisma.sql`AND e.company_position = ANY(${positionArray}::uuid[])`
    : Prisma.empty;
  const reportPositionClause = hasPositions
    ? Prisma.sql`AND e.company_position = ANY(${positionArray}::uuid[])`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ employee_id: string }[]>(Prisma.sql`
    WITH operativos AS (
      SELECT DISTINCT ed.employee_id
      FROM employees_diagram ed
      INNER JOIN diagram_type dt ON ed.diagram_type = dt.id
      INNER JOIN employees e ON ed.employee_id = e.id
      WHERE ed.day = ${day} AND ed.month = ${month} AND ed.year = ${year}
        AND dt.work_active = true AND dt.is_active = true
        AND e.is_active = true AND e.company_id = ${companyId}::uuid
        ${operativePositionClause}
    ),
    in_report AS (
      SELECT DISTINCT drer.employee_id
      FROM dailyreportemployeerelations drer
      INNER JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id
      INNER JOIN dailyreport dr ON drr.daily_report_id = dr.id
      INNER JOIN employees e ON drer.employee_id = e.id
      WHERE dr.date = ${todayDate}::date AND dr.is_active = true
        AND e.company_id = ${companyId}::uuid AND e.is_active = true
        AND drer.employee_id IS NOT NULL
        ${reportPositionClause}
    )
    SELECT o.employee_id
    FROM operativos o
    WHERE o.employee_id NOT IN (SELECT employee_id FROM in_report)
    LIMIT GREATEST(
      (SELECT COUNT(*)::int FROM operativos) - (SELECT COUNT(*)::int FROM in_report),
      0
    )
  `);

  return rows.map((row) => row.employee_id);
}

/**
 * WHERE de empleados disponibles: con diagrama de trabajo hoy, fuera del parte, y con los
 * filtros activos del DataTable aplicados.
 */
async function buildAvailableEmployeesWhere(
  companyId: string,
  positionIds: readonly string[],
  state: ReturnType<typeof parseSearchParams>
) {
  const { day, month, year } = getTodayParts();
  const todayDate = getOperationToday();

  const availableIds = await getAvailableEmployeeIds(companyId, positionIds, todayDate, day, month, year);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...TEXT_COLUMNS, 'customers', 'diagram'],
  });

  const customerValues = state.filters['customers'];
  const m2mFilter: Record<string, unknown> = {};
  const extraAndConditions: Record<string, unknown>[] = [];

  if (customerValues?.length) {
    const hasNull = customerValues.includes(NULL_FILTER_VALUE);
    const realValues = customerValues.filter((value) => value !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [
          { contractor_employee: { some: { contractor_id: { in: realValues } } } },
          { contractor_employee: { none: {} } },
        ],
      });
    } else if (hasNull) {
      m2mFilter.contractor_employee = { none: {} };
    } else {
      m2mFilter.contractor_employee = { some: { contractor_id: { in: realValues } } };
    }
  }

  const filtersWhereRecord = filtersWhere as Record<string, unknown> & { AND?: Record<string, unknown>[] };
  const allAndConditions = [...(filtersWhereRecord.AND ?? []), ...extraAndConditions];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhereRecord;

  return {
    id: { in: availableIds },
    is_active: true as const,
    company_id: companyId,
    ...buildSearchWhere(state.search, ['lastname', 'firstname', 'cuil', 'file']),
    ...filtersWhereWithoutAnd,
    ...buildTextFiltersWhere(state.filters, TEXT_COLUMNS),
    ...m2mFilter,
    ...(allAndConditions.length > 0 ? { AND: allAndConditions } : {}),
  };
}

/** Empleados disponibles paginados (con diagrama de trabajo hoy y fuera del parte). */
export async function getAvailableEmployeesPaginated(searchParams: DataTableSearchParams, positionIds?: string[]) {
  logger.debug('Obteniendo empleados disponibles paginados', { data: { positionIds } });

  try {
    const companyId = await getActiveCompanyId();
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = await buildAvailableEmployeesWhere(companyId, sanitizePositionIds(positionIds), state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const sort of state.sorting) {
      if (!VALID_SORT_FIELDS.has(sort.id)) continue;
      const dir: 'asc' | 'desc' = sort.desc ? 'desc' : 'asc';
      const fkMapper = FK_SORT_MAP[sort.id];
      resolvedSorts.push(fkMapper ? fkMapper(dir) : { [sort.id]: dir });
    }
    const safeOrderBy = [...resolvedSorts, { lastname: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.employees.findMany({ where, skip, take, orderBy: safeOrderBy, select: buildAvailableEmployeeSelect() }),
      prisma.employees.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener empleados disponibles paginados', { data: { error } });
    throw error;
  }
}

// Tipo inferido desde la query — NUNCA tipar manualmente
export type AvailableEmployeeListItem = Awaited<ReturnType<typeof getAvailableEmployeesPaginated>>['data'][number];

/** Todos los empleados disponibles sin paginar, para la exportación a Excel. */
export async function getAllAvailableEmployeesForExport(searchParams: DataTableSearchParams, positionIds?: string[]) {
  logger.debug('Exportando empleados disponibles', { data: { positionIds } });

  try {
    const companyId = await getActiveCompanyId();
    const state = parseSearchParams(searchParams);
    const where = await buildAvailableEmployeesWhere(companyId, sanitizePositionIds(positionIds), state);

    return await prisma.employees.findMany({
      where,
      orderBy: [{ lastname: 'asc' }],
      select: buildAvailableEmployeeSelect(),
    });
  } catch (error) {
    logger.error('Error al exportar empleados disponibles', { data: { error } });
    throw error;
  }
}

/** Facetas por columna con cross-filter para el listado de empleados disponibles. */
export async function getAvailableEmployeeSingleFacet(
  columnId: string,
  searchParams: DataTableSearchParams,
  positionIds?: string[]
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  logger.debug('Obteniendo facet de empleados disponibles', { data: { columnId } });

  try {
    const companyId = await getActiveCompanyId();
    const state = parseSearchParams(searchParams);
    const positions = sanitizePositionIds(positionIds);

    async function crossWhere(excludeColumn: string) {
      const modified = { ...state, filters: { ...state.filters } };
      delete modified.filters[excludeColumn];
      delete modified.filters[`${excludeColumn}_from`];
      delete modified.filters[`${excludeColumn}_to`];
      return buildAvailableEmployeesWhere(companyId, positions, modified);
    }

    switch (columnId) {
      case 'company_positions': {
        const where = await crossWhere('company_positions');
        const rows = await prisma.employees.groupBy({ by: ['company_position'], where, _count: true });
        const counts = toFacetMap(rows.map((row) => ({ key: row.company_position, count: row._count })));
        const ids = rows.map((row) => row.company_position).filter((id): id is string => id != null);
        const resolvedOptions =
          ids.length > 0
            ? await prisma.company_positions.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions };
      }

      case 'customers': {
        const where = await crossWhere('customers');
        const [totalInCross, withCustomer, relations] = await Promise.all([
          prisma.employees.count({ where }),
          prisma.employees.count({ where: { ...where, contractor_employee: { some: {} } } }),
          prisma.contractor_employee.findMany({
            where: { employees: where },
            select: { contractor_id: true, employee_id: true, customers: { select: { id: true, name: true } } },
          }),
        ]);

        const counts = new Map<string, number>();
        const withoutCustomer = totalInCross - withCustomer;
        if (withoutCustomer > 0) counts.set(NULL_FILTER_VALUE, withoutCustomer);

        const employeesByContractor = new Map<string, Set<string>>();
        const customerNames = new Map<string, string>();
        for (const relation of relations) {
          const contractorId = relation.contractor_id;
          const employeeId = relation.employee_id;
          if (!contractorId || !employeeId) continue;
          let employeeSet = employeesByContractor.get(contractorId);
          if (!employeeSet) {
            employeeSet = new Set();
            employeesByContractor.set(contractorId, employeeSet);
          }
          employeeSet.add(employeeId);
          if (relation.customers?.name) customerNames.set(contractorId, relation.customers.name);
        }
        for (const [contractorId, employeeSet] of employeesByContractor) {
          counts.set(contractorId, employeeSet.size);
        }

        return { counts, resolvedOptions: [...customerNames.entries()].map(([id, name]) => ({ id, name })) };
      }

      case 'diagram': {
        const { day, month, year } = getTodayParts();
        const where = await crossWhere('diagram');
        const employees = await prisma.employees.findMany({ where, select: { id: true } });
        const ids = employees.map((employee) => employee.id);
        if (ids.length === 0) return { counts: new Map(), resolvedOptions: [] };

        const diagrams = await prisma.employees_diagram.findMany({
          where: {
            employee_id: { in: ids },
            day,
            month,
            year,
            diagram_type_employees_diagram_diagram_typeTodiagram_type: { work_active: true, is_active: true },
          },
          select: {
            diagram_type: true,
            diagram_type_employees_diagram_diagram_typeTodiagram_type: {
              select: { id: true, short_description: true },
            },
          },
          distinct: ['employee_id'],
        });

        const counts = new Map<string, number>();
        const diagramNames = new Map<string, string>();
        for (const diagram of diagrams) {
          const key = diagram.diagram_type;
          counts.set(key, (counts.get(key) ?? 0) + 1);
          const diagramType = diagram.diagram_type_employees_diagram_diagram_typeTodiagram_type;
          if (diagramType?.short_description) diagramNames.set(key, diagramType.short_description);
        }

        return { counts, resolvedOptions: [...diagramNames.entries()].map(([id, name]) => ({ id, name })) };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet de empleados disponibles', { data: { error, columnId } });
    return null;
  }
}
