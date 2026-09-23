'use server';

import type { Prisma } from '@/generated/prisma/client';
import { buildFullname, registerUserSchema, type RegisterUserInput } from '@/features/Auth/schemas/register-user';
import { checkPermissionServer } from '@/features/Permissions/actions/permissions.server';
import { Logger } from '@/lib/logger';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { COMPANY_USERS_INVALIDATION } from '@/shared/constants/cache-invalidation-map';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';

/**
 * Alta de usuario de la empresa activa (tab Empresa → Usuarios).
 *
 * Dos caminos: si el email ya tiene `profile`, se lo agrega a la empresa activa; si no, se crea la
 * credencial en Auth y después el perfil, la pertenencia y el rol.
 *
 * Perímetro sin RLS (esto es un endpoint público):
 * - La empresa sale SIEMPRE de `getActiveCompanyId()`; el caller no manda `companyId` ni se lee la
 *   cookie `actualComp` a mano.
 * - Exige `empresa.usuarios-empleados.create`, el mismo permiso que ya guardaba el botón en la UI.
 *   Sin esto cualquier usuario logueado podía crear usuarios y asignarles el rol que quisiera.
 * - `customer_id` salía de `values.customer`, un uuid del cliente que nadie validaba (y que ningún
 *   llamador mandaba): se eliminó del contrato.
 *
 * Las llamadas `auth.*` se conservan y están marcadas `// P4: auth` (P4 las reemplaza por Better
 * Auth); lo que es dato ya va por Prisma.
 */
const logger = new Logger('features/Auth/register-user');

export type RegisterUserResult = { success: true; message: string } | { success: false; error: string };

/**
 * Otorga el rol elegido EN esta empresa.
 *
 * Hasta la Task 13a `user_roles` no tenía `company_id`, así que el rol era global y esto
 * estaba acotado a un bootstrap ("sólo si el usuario todavía no tiene ningún rol") para que
 * invitar a un usuario de otra empresa no lo subiera a admin allá. El efecto colateral era
 * que a un invitado que ya pertenecía a otra empresa NO se le daba el rol elegido: entraba
 * con los permisos que ya traía. Con `company_id` el rol no sale de esta empresa y el
 * invitado recibe el que se le eligió, sin excepciones.
 *
 * `skipDuplicates`: dos altas simultáneas del mismo usuario chocarían con la unique
 * (user_id, role_id, company_id) y abortarían la transacción entera.
 */
async function assignRoleInCompany(
  tx: Prisma.TransactionClient,
  credentialId: string,
  roleId: bigint,
  companyId: string,
  assignedBy: string
): Promise<void> {
  await tx.user_roles.createMany({
    data: [{ user_id: credentialId, role_id: roleId, company_id: companyId, assigned_by: assignedBy }],
    skipDuplicates: true,
  });
}

export async function registerUserWithRole(values: RegisterUserInput): Promise<RegisterUserResult> {
  const parsed = registerUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const { email, password, role } = parsed.data;
  const fullname = buildFullname(parsed.data);

  try {
    const [companyId, actor] = await Promise.all([getActiveCompanyId(), getSessionUserId()]);
    if (!actor) return { success: false, error: 'Sesión requerida' };

    if (!(await checkPermissionServer('empresa', 'usuarios-empleados', 'create'))) {
      return { success: false, error: 'No tenés permiso para crear usuarios en esta empresa' };
    }

    const roleRow = await prisma.roles.findFirst({
      where: { id: BigInt(role), is_active: true },
      select: { id: true, name: true },
    });
    if (!roleRow) return { success: false, error: 'El rol seleccionado no existe' };

    const profile = await prisma.profile.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, credential_id: true },
    });

    if (profile) {
      await addExistingProfileToCompany({ profile, companyId, roleId: roleRow.id, actor });
    } else {
      await createUserForCompany({ email, password, fullname, companyId, role: roleRow, actor });
    }

    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    return { success: true, message: 'Usuario creado exitosamente' };
  } catch (error) {
    logger.error('Error en registerUserWithRole', { data: { error } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud',
    };
  }
}

/** Alta de la pertenencia (y del rol) de un perfil que ya existe en otra empresa. */
async function addExistingProfileToCompany({
  profile,
  companyId,
  roleId,
  actor,
}: {
  profile: { id: string; credential_id: string | null };
  companyId: string;
  roleId: bigint;
  actor: string;
}): Promise<void> {
  const existingAccess = await prisma.share_company_users.findFirst({
    where: { profile_id: profile.id, company_id: companyId },
    select: { id: true },
  });
  if (existingAccess) throw new Error('El usuario ya tiene acceso a esta empresa');

  if (!profile.credential_id) throw new Error('El usuario no tiene credenciales de acceso vinculadas.');
  // Sin `force` a propósito (a diferencia de `createUserForCompany`): este usuario ya existía y
  // puede tener otra empresa activa en su JWT; sumarlo a una nueva no es motivo para sacarlo de
  // donde estaba. El `force` del alta completa es correcto porque ahí no hay nada que pisar.
  await ensureCompanyMetadata(profile.credential_id, companyId); // P4: auth

  const credentialId = profile.credential_id;
  await withActor(actor, async (tx) => {
    await tx.share_company_users.create({ data: { company_id: companyId, profile_id: profile.id } });
    await assignRoleInCompany(tx, credentialId, roleId, companyId, actor);
  });

  logger.info('Usuario existente agregado a la empresa', { data: { profileId: profile.id, companyId } });
}

/** Alta completa: credencial en Auth + perfil, pertenencia y rol en la base. */
async function createUserForCompany({
  email,
  password,
  fullname,
  companyId,
  role,
  actor,
}: {
  email: string;
  password: string | undefined;
  fullname: string;
  companyId: string;
  role: { id: bigint; name: string };
  actor: string;
}): Promise<void> {
  const adminSupabase = await adminSupabaseServer(); // P4: auth
  const hasPassword = Boolean(password?.trim());

  // P4: auth — creación de la credencial auto-verificada.
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: hasPassword ? password : undefined,
    email_confirm: true,
    user_metadata: { fullname, needs_password_change: !hasPassword },
  });

  if (authError) {
    logger.error('Error creando usuario', { data: { error: authError } });
    throw new Error(`Error al crear usuario: ${authError.message}`);
  }

  const credentialId = authData.user?.id;
  if (!credentialId) throw new Error('No se pudo obtener el ID del usuario');

  try {
    // La empresa activa del nuevo usuario va en el JWT: sin esto entra sin empresa.
    await ensureCompanyMetadata(credentialId, companyId, { force: true }); // P4: auth

    await withActor(actor, async (tx) => {
      await tx.profile.create({
        data: {
          id: credentialId,
          email,
          fullname,
          role: role.name, // columna legacy: FK a roles.name
          credential_id: credentialId,
        },
      });
      await tx.share_company_users.create({ data: { company_id: companyId, profile_id: credentialId } });
      await assignRoleInCompany(tx, credentialId, role.id, companyId, actor);
    });
  } catch (error) {
    // La credencial ya existe en Auth pero no hay perfil: se elimina para no dejar un usuario
    // huérfano que pueda loguearse sin empresa.
    logger.error('Error creando el perfil del usuario, rollback de la credencial en Auth', { data: { error } });
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(credentialId); // P4: auth
    if (deleteError) {
      logger.error('CRITICO: no se pudo eliminar la credencial huérfana en Auth', {
        data: { deleteError, credentialId },
      });
    }
    throw error;
  }

  if (!hasPassword) {
    // Invitación: el usuario define su propia contraseña con el flujo nativo de recuperación.
    const supabase = await supabaseServer(); // P4: auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
    });
    if (error) {
      logger.warn('Usuario creado pero no se pudo enviar el email de invitación', { data: { error, email } });
    }
  }

  logger.info('Usuario creado y agregado a la empresa', { data: { credentialId, companyId } });
}

/** Deja `app_metadata.company` apuntando a la empresa activa. P4: auth */
async function ensureCompanyMetadata(credentialId: string, companyId: string, options?: { force: boolean }): Promise<void> {
  const adminSupabase = await adminSupabaseServer(); // P4: auth

  if (!options?.force) {
    const { data: userData } = await adminSupabase.auth.admin.getUserById(credentialId); // P4: auth
    if (userData?.user?.app_metadata?.company) return;
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(credentialId, {
    app_metadata: { company: companyId },
  });
  if (error) throw new Error(`Error al asignar metadata: ${error.message}`);
}
