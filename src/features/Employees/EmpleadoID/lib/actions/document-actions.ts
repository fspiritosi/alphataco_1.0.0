'use server';

import { Logger } from '@/lib/logger';
import { adminSupabaseServer } from '@/lib/supabase/server'; // P4: auth
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
    const profile = await prisma.profile.findFirst({
      where: { employee_id: employeeId },
      select: { id: true, credential_id: true },
    });

    if (profile?.credential_id) {
      const adminSupabase = await adminSupabaseServer(); // P4: auth
      const { error: banError } = await adminSupabase.auth.admin.updateUserById(profile.credential_id, { // P4: auth
        ban_duration: activate ? 'none' : '876600h',
      });

      if (banError) {
        logger.warn('No se pudo actualizar ban del usuario', {
          data: { error: banError, employeeId, activate },
        });
      } else {
        logger.info(`Usuario ${activate ? 'desbaneado' : 'baneado'} exitosamente`, {
          data: { employeeId, credentialId: profile.credential_id },
        });

        // Sincronizar share_company_users.is_active con el estado del ban
        try {
          await prisma.share_company_users.updateMany({
            where: { profile_id: profile.id },
            data: { is_active: activate },
          });

          await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
        } catch (syncErr) {
          logger.warn('No se pudo sincronizar is_active en share_company_users', {
            data: { error: syncErr, profileId: profile.id, activate },
          });
        }
      }
    }
  } catch (banErr) {
    logger.error('Error en proceso de ban/unban', { data: { error: banErr, employeeId } });
  }

  revalidatePath('/dashboard/employee/action');
  revalidatePath('/dashboard/employee');
}
