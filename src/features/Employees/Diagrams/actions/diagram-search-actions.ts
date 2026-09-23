'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { toDateOnly } from '@/shared/lib/date-only';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import moment from 'moment';

const logger = new Logger('features/Employees/Diagrams');

/**
 * Search employees with their diagrams (paginated)
 */
export async function searchEmployeeDiagrams(params: {
  firstname?: string;
  lastname?: string;
  positions?: string[];
  workflows?: string[];
  costCenters?: string[];
  covenants?: string[];
  guilds?: string[];
  categories?: string[];
  contractors?: string[];
  diagramTypes?: string[];
  page: number;
  pageSize: number;
}) {
  // La empresa sale de la sesión validada, no del claim crudo: con `undefined` el
  // `where` de Prisma se ignora y la búsqueda devolvía los empleados de todas las empresas.
  const companyId = await getActiveCompanyId();

  logger.debug('Searching employee diagrams', { data: { params } });

  try {
    const where: Record<string, unknown> = {
      is_active: true,
      company_id: companyId,
    };

    if (params.firstname?.trim()) {
      where.firstname = { contains: params.firstname.trim(), mode: 'insensitive' };
    }
    if (params.lastname?.trim()) {
      where.lastname = { contains: params.lastname.trim(), mode: 'insensitive' };
    }
    if (params.positions?.length) {
      where.company_position = { in: params.positions };
    }
    if (params.workflows?.length) {
      where.workflow_diagram = { in: params.workflows };
    }
    if (params.costCenters?.length) {
      where.cost_center_id = { in: params.costCenters };
    }
    if (params.covenants?.length) {
      where.covenants_id = { in: params.covenants };
    }
    if (params.guilds?.length) {
      where.guild_id = { in: params.guilds };
    }
    if (params.categories?.length) {
      where.category_id = { in: params.categories };
    }
    if (params.contractors?.length) {
      where.contractor_employee = {
        some: { contractor_id: { in: params.contractors } },
      };
    }

    // Diagram type filter — scoped to today's date (same as dashboard getDiagramIndicators)
    if (params.diagramTypes?.length) {
      const now = moment().utcOffset(-3);
      const todayFilter = { day: now.date(), month: now.month() + 1, year: now.year() };

      const hasNoDiagram = params.diagramTypes.includes('__none__');
      const actualTypes = params.diagramTypes.filter((t) => t !== '__none__');

      if (hasNoDiagram && actualTypes.length === 0) {
        where.employees_diagram = { none: todayFilter };
      } else if (hasNoDiagram && actualTypes.length > 0) {
        where.OR = [
          { employees_diagram: { none: todayFilter } },
          { employees_diagram: { some: { ...todayFilter, diagram_type: { in: actualTypes } } } },
        ];
      } else {
        where.employees_diagram = {
          some: { ...todayFilter, diagram_type: { in: actualTypes } },
        };
      }
    }

    const [data, total] = await Promise.all([
      prisma.employees.findMany({
        where,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          document_number: true,
          file: true,
          date_of_admission: true,
          // FK relations resueltas para enriquecer el export a Excel
          company_positions: { select: { id: true, name: true } },
          hierarchy: { select: { id: true, name: true } },
          work_diagram: { select: { id: true, name: true } },
          cost_center: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          covenant: { select: { id: true, name: true } },
          guild: { select: { id: true, name: true } },
          employees_diagram: {
            select: {
              id: true,
              day: true,
              month: true,
              year: true,
              is_active: true,
              created_at: true,
              employee_id: true,
              comments: true,
              diagram_type_employees_diagram_diagram_typeTodiagram_type: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  short_description: true,
                  company_id: true,
                  created_at: true,
                  is_active: true,
                  work_active: true,
                },
              },
            },
          },
          contractor_employee: {
            select: {
              customers: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { lastname: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.employees.count({ where }),
    ]);

    return {
      data: data.map((emp) => ({
        value: emp.id,
        label: `${emp.lastname?.charAt(0).toUpperCase()}${emp.lastname?.slice(1)} ${emp.firstname?.charAt(0).toUpperCase()}${emp.firstname?.slice(1)}`,
        file: emp.file,
        // Datos del empleado para enriquecer el export a Excel
        position: emp.company_positions?.name ?? '',
        sector: emp.hierarchy?.name ?? '',
        // `date_of_admission` es `@db.Date`: se serializa como 'YYYY-MM-DD'. Con el ISO
        // completo (medianoche UTC) el `moment()` del cliente mostraba el dia anterior en UTC-3.
        dateOfAdmission: toDateOnly(emp.date_of_admission),
        workDiagram: emp.work_diagram?.name ?? '',
        costCenter: emp.cost_center?.name ?? '',
        category: emp.category?.name ?? '',
        covenant: emp.covenant?.name ?? '',
        guild: emp.guild?.name ?? '',
        // Convert Prisma Decimal fields to number for downstream compatibility
        diagrams: emp.employees_diagram.map((d) => {
          const dt = d.diagram_type_employees_diagram_diagram_typeTodiagram_type;
          return {
            id: d.id,
            created_at: d.created_at.toISOString(),
            employee_id: d.employee_id,
            is_active: d.is_active,
            day: Number(d.day),
            month: Number(d.month),
            year: Number(d.year),
            comments: d.comments,
            diagram_type: {
              id: dt.id,
              name: dt.name,
              color: dt.color,
              short_description: dt.short_description,
              company_id: dt.company_id,
              created_at: dt.created_at.toISOString(),
              is_active: dt.is_active,
              work_active: dt.work_active,
            },
          };
        }),
        contractor_employee: emp.contractor_employee,
      })),
      total,
      hasMore: params.page * params.pageSize < total,
    };
  } catch (error) {
    logger.error('Error searching employee diagrams', { data: { error } });
    throw error;
  }
}

export type DiagramSearchResult = Awaited<ReturnType<typeof searchEmployeeDiagrams>>;
export type DiagramEmployee = DiagramSearchResult['data'][number];

/**
 * Get filter options for a specific filter type (on-demand).
 * Each filter type loads independently to avoid loading all catalogs upfront.
 */
export async function getDiagramFilterOptions(filterType: string) {
  const companyId = await getActiveCompanyId();

  logger.debug('Loading filter options', { data: { filterType } });

  try {
    switch (filterType) {
      case 'positions':
        return prisma.company_positions.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      case 'workflows':
        return prisma.work_diagram.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      case 'costCenters':
        return prisma.cost_center.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      case 'covenants':
        return prisma.covenant.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      case 'guilds':
        return prisma.guild.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      case 'categories':
        // `category` no tiene `company_id`: cuelga del convenio, que sí es de una empresa.
        return prisma.category.findMany({
          where: { is_active: true, covenant: { company_id: companyId } },
          select: {
            id: true,
            name: true,
            covenant: { select: { name: true } },
          },
          orderBy: { name: 'asc' },
        });
      case 'contractors':
        return prisma.customers.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      case 'diagramTypes':
        return prisma.diagram_type.findMany({
          where: { company_id: companyId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      default:
        return [];
    }
  } catch (error) {
    logger.error('Error loading filter options', { data: { error, filterType } });
    throw error;
  }
}

export type FilterOption = { id: string; name: string | null };
export type CategoryFilterOption = { id: string; name: string | null; covenant: { name: string | null } | null };
