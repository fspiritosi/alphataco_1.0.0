'use server';

import { checkPermissionServer } from '@/features/Permissions/actions/permissions.server';
import { Logger } from '@/lib/logger';
import { adminSupabaseServer } from '@/lib/supabase/server'; // P4: auth
import { COMPANY_USERS_INVALIDATION } from '@/shared/constants/cache-invalidation-map';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { callScalar } from '@/shared/lib/sql';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { z } from 'zod';
import { BAN_FOREVER, NO_BAN, planUserStatusChange, type UserStatusPlan } from './lib/user-status';

/**
 * Mutaciones de la tab Usuarios: baja/reactivación (ban de Auth + `share_company_users.is_active`
 * + legajo vinculado), vinculación de legajo y nombre del perfil.
 *
 * Perímetro sin RLS: toda fila de `share_company_users` se busca por `{ id, company_id: activa }`;
 * los legajos se escriben acotados a la empresa activa; las mutaciones exigen
 * `empresa.usuarios-empleados.update|delete`. El único contacto con Supabase es el ban/unban de
 * Auth (`// P4: auth`); `update_employee_diagram_status` va por `callScalar` (antes `.rpc`).
 */
const logger = new Logger('Empresa/Usuarios/mutations');

const USERS_TAB = 'usuarios-empleados';

const diagramStatusResultSchema = z.object({ success: z.boolean(), affected_rows: z.coerce.number().optional() });

async function assertUsersPermission(action: 'update' | 'delete'): Promise<void> {
  if (!(await checkPermissionServer('empresa', USERS_TAB, action))) {
    throw new Error('No tenés permiso para realizar esta acción');
  }
}

/** El nombre se edita desde la tabla (`usuarios-empleados`) o desde el detalle (`detalle-usuario`). */
async function assertCanEditProfileName(): Promise<void> {
  const [fromList, fromDetail] = await Promise.all([
    checkPermissionServer('empresa', USERS_TAB, 'update'),
    checkPermissionServer('empresa', 'detalle-usuario', 'update'),
  ]);
  if (!fromList && !fromDetail) throw new Error('No tenés permiso para realizar esta acción');
}

async function requireActor(): Promise<string> {
  const actor = await getSessionUserId();
  if (!actor) throw new Error('Sesión requerida');
  return actor;
}

/** Usuario compartido de la empresa activa con su perfil y legajo vinculado. */
async function findScopedShareUser(shareCompanyUserId: string, companyId: string) {
  const shareUser = await prisma.share_company_users.findFirst({
    where: { id: shareCompanyUserId, company_id: companyId },
    select: {
      id: true,
      profile: {
        select: {
          id: true,
          credential_id: true,
          employees: { select: { id: true, is_active: true, company_id: true } },
        },
      },
    },
  });
  if (!shareUser) throw new Error('Usuario no encontrado en la empresa activa');
  if (!shareUser.profile?.credential_id) {
    throw new Error('El usuario no tiene credenciales de acceso vinculadas.');
  }
  return { id: shareUser.id, credentialId: shareUser.profile.credential_id, linkedEmployee: shareUser.profile.employees };
}

/** Sube/baja el ban en Auth. Devuelve el mensaje de error o null. P4: auth */
async function setAuthBan(credentialId: string, banDuration: string): Promise<string | null> {
  const adminSupabase = await adminSupabaseServer(); // P4: auth
  const { error } = await adminSupabase.auth.admin.updateUserById(credentialId, { ban_duration: banDuration }); // P4: auth
  return error ? error.message : null;
}

/**
 * Aplica un `UserStatusPlan`: primero el ban en Auth (fuera de la tx), después `is_active` de la
 * pertenencia y el legajo (con sus diagramas) dentro de `withActor`. Si la transacción falla se
 * revierte el ban en Auth.
 */
async function applyUserStatusPlan(
  plan: UserStatusPlan,
  shareUser: Awaited<ReturnType<typeof findScopedShareUser>>,
  companyId: string,
  actor: string
): Promise<void> {
  const banError = await setAuthBan(shareUser.credentialId, plan.banDuration);
  if (banError) {
    logger.error('Error actualizando el ban del usuario en Auth', { data: { banError, credentialId: shareUser.credentialId } });
    throw new Error(`Error al ${plan.membershipActive ? 'reactivar' : 'banear'} usuario: ${banError}`);
  }

  try {
    await withActor(actor, async (tx) => {
      await tx.share_company_users.update({ where: { id: shareUser.id }, data: { is_active: plan.membershipActive } });

      if (plan.employee) {
        const { id: employeeId, ...employeeData } = plan.employee;
        const updated = await tx.employees.updateMany({ where: { id: employeeId, company_id: companyId }, data: employeeData });
        if (updated.count === 0) throw new Error('El legajo vinculado no pertenece a la empresa activa');

        const diagramResult = await callScalar(
          'update_employee_diagram_status',
          [{ uuid: employeeId }, employeeData.is_active],
          diagramStatusResultSchema,
          tx
        );
        if (!diagramResult.success) {
          logger.warn('No se pudo actualizar el estado de los diagramas del empleado', {
            data: { employeeId, isActive: employeeData.is_active, diagramResult },
          });
        }
        logger.info(employeeData.is_active ? 'Empleado vinculado reactivado' : 'Empleado vinculado dado de baja', {
          data: { employeeId },
        });
      }
    });
  } catch (txError) {
    // Rollback del ban en Auth si la base falla
    logger.error('Error actualizando la base, rollback del ban en Auth', { data: { txError } });
    const rollbackError = await setAuthBan(shareUser.credentialId, plan.membershipActive ? BAN_FOREVER : NO_BAN);
    if (rollbackError) {
      logger.error('CRITICO: rollback del ban en Auth falló', {
        data: { rollbackError, credentialId: shareUser.credentialId, shareCompanyUserId: shareUser.id },
      });
    }
    throw txError;
  }

  await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
}

// ── Baja (ban) ───────────────────────────────────────────────────────────────
export async function banCompanyUser(shareCompanyUserId: string, employeeTermination?: { reason: string; date: Date }) {
  logger.debug('Baneando usuario de empresa', { data: { shareCompanyUserId } });
  try {
    const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);
    await assertUsersPermission('delete');
    const shareUser = await findScopedShareUser(shareCompanyUserId, companyId);
    const plan = planUserStatusChange({ action: 'ban', linkedEmployee: shareUser.linkedEmployee, employeeTermination });
    await applyUserStatusPlan(plan, shareUser, companyId, actor);
    logger.info('Usuario baneado exitosamente', { data: { shareCompanyUserId, credentialId: shareUser.credentialId } });
  } catch (error) {
    logger.error('Error baneando usuario de empresa', { data: { error, shareCompanyUserId } });
    throw error;
  }
}

// ── Reactivación (unban) ─────────────────────────────────────────────────────
export async function unbanCompanyUser(shareCompanyUserId: string, reactivateEmployee?: boolean) {
  logger.debug('Desbaneando usuario de empresa', { data: { shareCompanyUserId } });
  try {
    const [companyId, actor] = await Promise.all([getActiveCompanyId(), requireActor()]);
    await assertUsersPermission('update');
    const shareUser = await findScopedShareUser(shareCompanyUserId, companyId);
    const plan = planUserStatusChange({ action: 'unban', linkedEmployee: shareUser.linkedEmployee, reactivateEmployee });
    await applyUserStatusPlan(plan, shareUser, companyId, actor);
    logger.info('Usuario desbaneado exitosamente', { data: { shareCompanyUserId, credentialId: shareUser.credentialId } });
  } catch (error) {
    logger.error('Error desbaneando usuario de empresa', { data: { error, shareCompanyUserId } });
    throw error;
  }
}

// ── Eliminar usuario de empresa (legacy) ─────────────────────────────────────
export async function deleteCompanyUser(shareCompanyUserId: string) {
  logger.debug('Eliminando usuario de empresa', { data: { shareCompanyUserId } });
  try {
    const companyId = await getActiveCompanyId();
    await assertUsersPermission('delete');
    const deleted = await prisma.share_company_users.deleteMany({ where: { id: shareCompanyUserId, company_id: companyId } });
    if (deleted.count === 0) throw new Error('Usuario no encontrado en la empresa activa');
    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Usuario eliminado exitosamente', { data: { shareCompanyUserId } });
  } catch (error) {
    logger.error('Error eliminando usuario de empresa', { data: { error, shareCompanyUserId } });
    throw error;
  }
}

/** El perfil tiene que ser miembro (u owner) de la empresa activa para poder editarlo desde acá. */
async function assertProfileInCompany(profileId: string, companyId: string): Promise<void> {
  const [membership, company] = await Promise.all([
    prisma.share_company_users.findFirst({ where: { profile_id: profileId, company_id: companyId }, select: { id: true } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { owner_id: true } }),
  ]);
  if (!membership && company?.owner_id !== profileId) throw new Error('El usuario no pertenece a la empresa activa');
}

// ── Vincular/desvincular empleado a perfil ────────────────────────────────────
export async function linkEmployeeToProfile(profileId: string, employeeId: string | null) {
  logger.debug('Vinculando empleado a perfil', { data: { profileId, employeeId } });
  try {
    const companyId = await getActiveCompanyId();
    await assertUsersPermission('update');
    await assertProfileInCompany(profileId, companyId);

    if (employeeId) {
      const [employee, alreadyLinked] = await Promise.all([
        prisma.employees.findFirst({ where: { id: employeeId, company_id: companyId }, select: { id: true } }),
        prisma.profile.findFirst({ where: { employee_id: employeeId, NOT: { id: profileId } }, select: { id: true } }),
      ]);
      if (!employee) throw new Error('El empleado no pertenece a la empresa activa');
      if (alreadyLinked) throw new Error('El empleado ya está vinculado a otro usuario');
    }

    await prisma.profile.update({ where: { id: profileId }, data: { employee_id: employeeId } });
    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Empleado vinculado exitosamente', { data: { profileId, employeeId } });
  } catch (error) {
    logger.error('Error vinculando empleado a perfil', { data: { error, profileId } });
    throw error;
  }
}

// ── Actualizar fullname del perfil ────────────────────────────────────────────
export async function updateProfileFullname(profileId: string, fullname: string) {
  logger.debug('Actualizando fullname del perfil', { data: { profileId } });

  const trimmed = fullname.trim();
  if (!trimmed) throw new Error('El nombre no puede estar vacío.');
  if (trimmed.length > 150) throw new Error('El nombre no puede superar los 150 caracteres.');

  try {
    const companyId = await getActiveCompanyId();
    await assertCanEditProfileName();
    await assertProfileInCompany(profileId, companyId);
    await prisma.profile.update({ where: { id: profileId }, data: { fullname: trimmed } });
    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Fullname actualizado exitosamente', { data: { profileId } });
  } catch (error) {
    logger.error('Error actualizando fullname del perfil', { data: { error, profileId } });
    throw error;
  }
}
