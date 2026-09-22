'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getSessionEmployeeIdClaim } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('Mantenimiento/shared/employee-session');

export interface MaintenanceEmployeeSessionData {
  employeeName: string | null;
  employeeCuil: string | null;
}

const EMPTY: MaintenanceEmployeeSessionData = { employeeName: null, employeeCuil: null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nombre y CUIL del operario logueado en el flujo de mantenimiento.
 *
 * El `employee_id` sale EXCLUSIVAMENTE del claim de la sesión (`app_metadata.employee_id`,
 * que escribe `completeMaintenanceEmployeeAnonymousSession` al validar el CUIL contra el
 * legajo). La cookie `empleado_id` que se leía antes es escribible por el cliente y tenía
 * prioridad sobre el claim: cualquier sesión podía leer el nombre y el CUIL de cualquier
 * empleado con sólo cambiarla. Además nadie la escribe ya, así que se sacó del todo.
 *
 * El legajo se busca además acotado a la empresa activa (en el camino QR es la del propio
 * empleado, que fija el login anónimo).
 */
export async function getMaintenanceEmployeeSessionData(): Promise<MaintenanceEmployeeSessionData> {
  const employeeId = await getSessionEmployeeIdClaim();
  if (!employeeId || !UUID_RE.test(employeeId)) return EMPTY;

  try {
    const companyId = await getActiveCompanyId();

    const employee = await prisma.employees.findFirst({
      where: { id: employeeId, company_id: companyId },
      select: { firstname: true, lastname: true, cuil: true },
    });

    if (!employee) return EMPTY;

    const fullName = `${employee.firstname ?? ''} ${employee.lastname ?? ''}`.trim();
    return { employeeName: fullName || null, employeeCuil: employee.cuil ?? null };
  } catch (error) {
    logger.error('Error al obtener los datos del empleado de la sesión', { data: { error } });
    return EMPTY;
  }
}
