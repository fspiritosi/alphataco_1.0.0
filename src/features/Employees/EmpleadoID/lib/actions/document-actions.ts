'use server';

import { Logger } from '@/lib/logger';
import { findUserProfileByEmployee } from '@/shared/lib/employee-profile';
import { COMPANY_USERS_INVALIDATION } from '@/shared/constants/cache-invalidation-map';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { callScalar } from '@/shared/lib/sql';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import moment from 'moment';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { toTerminationReason } from '../termination-reason';

const logger = new Logger('features/Employees/EmpleadoID/document-actions');

const diagramStatusResultSchema = z.object({ success: z.boolean(), affected_rows: z.coerce.number().optional() });

/**
 * Da de baja o reactiva a un empleado de la empresa activa: actualiza el legajo, replica el
 * estado a sus diagramas (`update_employee_diagram_status`) y banea/desbanea al usuario vinculado.
 * `reasonForTermination` llega como etiqueta de la UI ("Despido sin causa").
 */
export async function toggleEmployeeStatus(
  employeeId: string,
  activate: boolean,
  reasonForTermination?: string,
  terminationDate?: Date
) {
  const [companyId, actor] = await Promise.all([getActiveCompanyId(), getSessionUserId()]);
  if (!actor) throw new Error('Sesión requerida');

  await withActor(actor, async (tx) => {
    const updated = await tx.employees.updateMany({
      where: { id: employeeId, company_id: companyId },
      data: {
        is_active: activate,
        reason_for_termination: activate ? null : toTerminationReason(reasonForTermination),
        termination_date: terminationDate ? new Date(moment(terminationDate).format('YYYY-MM-DD')) : null,
      },
    });
    if (updated.count === 0) throw new Error('Empleado no encontrado en la empresa activa');

    const diagramResult = await callScalar(
      'update_employee_diagram_status',
      [{ uuid: employeeId }, activate],
      diagramStatusResultSchema,
      tx
    );
    if (!diagramResult.success) {
      logger.warn('No se pudo actualizar el estado de los diagramas del empleado', {
        data: { employeeId, activate, diagramResult },
      });
    }
  });

  // Ban/unban del usuario vinculado al empleado + sync share_company_users.is_active
  try {
    // El profile del USUARIO vinculado, no el de una sesión anónima del QR (que también lleva
    // `employee_id` y se crea uno por login): banear esa credencial no haría nada útil y
    // dejaría al usuario real entrando.
    const profile = await findUserProfileByEmployee(employeeId);

    if (profile?.credential_id) {
      const credentialId = profile.credential_id;

      // El ban de la credencial y la pertenencia viven en la misma base: van juntos. Al banear
      // se borran además las sesiones abiertas, para que la baja tenga efecto inmediato.
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: credentialId },
          data: {
            banned: !activate,
            banReason: activate ? null : 'Baja del legajo vinculado',
            updatedAt: new Date(),
          },
        });
        if (!activate) {
          await tx.session.deleteMany({ where: { userId: credentialId } });
        }
        // Acotado a la empresa activa: el `updateMany` filtraba sólo por `profile_id`, así que
        // dar de baja un legajo en la empresa A le desactivaba la pertenencia en la B. El
        // camino hermano (`applyUserStatusPlan`) siempre estuvo acotado; esto lo empareja.
        await tx.share_company_users.updateMany({
          where: { profile_id: profile.id, company_id: companyId },
          data: { is_active: activate },
        });
      });

      await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
      logger.info(`Usuario ${activate ? 'desbaneado' : 'baneado'} exitosamente`, {
        data: { employeeId, credentialId },
      });
    }
  } catch (banErr) {
    logger.error('Error en proceso de ban/unban', { data: { error: banErr, employeeId } });
  }

  revalidatePath('/dashboard/employee/action');
  revalidatePath('/dashboard/employee');
}
