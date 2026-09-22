'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getSessionEmployeeIdClaim } from '@/shared/lib/session';
import { cookies } from 'next/headers';

const logger = new Logger('Mantenimiento/shared/employee-session');

export interface MaintenanceEmployeeSessionData {
  employeeName: string | null;
  employeeCuil: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nombre y CUIL del operario logueado en el flujo de mantenimiento.
 *
 * El `employee_id` sale SIEMPRE del servidor (cookie del login del QR o claim de la
 * sesión): nunca lo manda el cliente. Si no hay legajo, cae al nombre que quedó guardado
 * en la cookie del login, que es lo único que se puede mostrar en ese caso.
 */
export async function getMaintenanceEmployeeSessionData(): Promise<MaintenanceEmployeeSessionData> {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get('empleado_id')?.value ?? (await getSessionEmployeeIdClaim());
  const fallbackName = cookieStore.get('empleado_name')?.value ?? null;

  if (!employeeId || !UUID_RE.test(employeeId)) {
    return { employeeName: fallbackName, employeeCuil: null };
  }

  try {
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: { firstname: true, lastname: true, cuil: true },
    });

    if (!employee) return { employeeName: fallbackName, employeeCuil: null };

    const fullName = `${employee.firstname ?? ''} ${employee.lastname ?? ''}`.trim();
    return { employeeName: fullName || fallbackName, employeeCuil: employee.cuil ?? null };
  } catch (error) {
    logger.error('Error al obtener los datos del empleado de la sesión', { data: { error } });
    return { employeeName: fallbackName, employeeCuil: null };
  }
}
