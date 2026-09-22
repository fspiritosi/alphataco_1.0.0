'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { buildDiagramDayRangeWhere, type DiagramDay } from '../lib/diagram-dates';

const logger = new Logger('features/Employees/Diagrams/queries');

/** Tipos de novedad (`diagram_type`) de la empresa activa, ordenados por nombre. */
export async function fetchDiagramsTypes() {
  const companyId = await getActiveCompanyId();

  try {
    return await prisma.diagram_type.findMany({
      where: withCompany({}, companyId),
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener los tipos de novedad', { data: { error } });
    return [];
  }
}

export type DiagramTypeRow = Awaited<ReturnType<typeof fetchDiagramsTypes>>[number];

/** Empleados activos de la empresa (id, nombre, apellido, legajo) para los selectores de diagramas. */
export async function getEmployeesName() {
  const companyId = await getActiveCompanyId();

  try {
    return await prisma.employees.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, firstname: true, lastname: true, file: true },
      orderBy: { lastname: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener los empleados', { data: { error } });
    return [];
  }
}

/**
 * Novedades ya cargadas de un empleado de la empresa activa entre dos fechas (inclusive).
 * Antes (PostgREST) sólo se consultaban el mes de inicio y el de fin; ahora el rango es completo.
 */
export async function getEmployeeDiagramByIdandDate(employeeId: string, fromDate: DiagramDay, toDate: DiagramDay) {
  const companyId = await getActiveCompanyId();

  try {
    const rows = await prisma.employees_diagram.findMany({
      where: {
        employee_id: employeeId,
        employees: { company_id: companyId },
        ...buildDiagramDayRangeWhere(fromDate, toDate),
      },
      select: {
        id: true,
        day: true,
        month: true,
        year: true,
        employees: { select: { id: true, firstname: true, lastname: true } },
        diagram_type_employees_diagram_diagram_typeTodiagram_type: { select: { id: true, name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      day: Number(row.day),
      month: Number(row.month),
      year: Number(row.year),
      employees: row.employees,
      diagram_type: row.diagram_type_employees_diagram_diagram_typeTodiagram_type,
    }));
  } catch (error) {
    logger.error('Error al obtener las novedades del empleado por fecha', { data: { error, employeeId } });
    return [];
  }
}

export type EmployeeDiagram = Awaited<ReturnType<typeof getEmployeeDiagramByIdandDate>>;
