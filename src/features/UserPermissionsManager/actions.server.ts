'use server';

import { PERMISSIONS, type ModuleSlug } from '@/features/Permissions/permissions-map';
import { Logger } from '@/lib/logger';
import { getCachedSession } from '@/shared/lib/cached-session';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/UserPermissionsManager');

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoleWithCount = Awaited<ReturnType<typeof getAllRolesWithCounts>>[number];
export type AllRolePermissionsMap = Awaited<ReturnType<typeof getAllRolePermissions>>;
export type ModulesWithTabsData = Awaited<ReturnType<typeof getModulesWithTabsServer>>;
export type UsersForRoleData = Awaited<ReturnType<typeof getUsersForRoleAssignment>>;

// ─── Read Actions ─────────────────────────────────────────────────────────────

/**
 * Obtiene todos los roles activos con el conteo de usuarios asignados.
 * Elimina el N+1 de getRoles + getRoleUserCounts.
 */
export async function getAllRolesWithCounts() {
  logger.debug('Obteniendo todos los roles con conteos');

  try {
    const roles = await prisma.roles.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        is_system: true,
        is_active: true,
        slug: true,
        intern: true,
        _count: {
          select: { user_roles: true },
        },
      },
    });

    // Convertir BigInt a number para serialización
    return roles.map((r) => ({
      ...r,
      id: Number(r.id),
      userCount: r._count.user_roles,
    }));
  } catch (error) {
    logger.error('Error al obtener roles con conteos', { data: { error } });
    throw error;
  }
}

/**
 * Obtiene TODOS los role_permissions en una sola query.
 * Retorna un Map<number, Array<{tabId, actionId}>> agrupado por role_id.
 * Elimina el N+1 de una query por RoleCard/RoleTemplateItem.
 */
export async function getAllRolePermissions(): Promise<Map<number, Array<{ tabId: string; actionId: string }>>> {
  logger.debug('Obteniendo todos los permisos de roles');

  try {
    const perms = await prisma.role_permissions.findMany({
      select: {
        role_id: true,
        tab_id: true,
        action_id: true,
        tabs: {
          select: {
            slug: true,
            modules: { select: { slug: true } },
          },
        },
        actions: {
          select: { slug: true },
        },
      },
    });

    const grouped = new Map<number, Array<{ tabId: string; actionId: string }>>();
    for (const p of perms) {
      const roleId = Number(p.role_id);
      if (!grouped.has(roleId)) grouped.set(roleId, []);
      grouped.get(roleId)!.push({ tabId: p.tab_id, actionId: p.action_id });
    }

    return grouped;
  } catch (error) {
    logger.error('Error al obtener todos los permisos de roles', { data: { error } });
    throw error;
  }
}

/**
 * Obtiene los permisos de un único rol.
 * Usado al editar un rol para pre-popular el editor de permisos.
 */
export async function getRolePermissionsServer(roleId: number): Promise<Array<{ tabId: string; actionId: string }>> {
  logger.debug('Obteniendo permisos del rol', { data: { roleId } });

  try {
    const perms = await prisma.role_permissions.findMany({
      where: { role_id: BigInt(roleId) },
      select: { tab_id: true, action_id: true },
    });

    return perms.map((p) => ({ tabId: p.tab_id, actionId: p.action_id }));
  } catch (error) {
    logger.error('Error al obtener permisos del rol', { data: { error, roleId } });
    throw error;
  }
}

/**
 * Obtiene módulos con tabs y acciones, aplicando allowedActions del permissions-map.
 * Reemplaza getModulesWithTabs de actions.ts (supabaseBrowser).
 */
export async function getModulesWithTabsServer() {
  logger.debug('Obteniendo módulos con tabs');

  try {
    const [modules, allTabs, actions] = await Promise.all([
      prisma.modules.findMany({
        where: { is_active: true },
        orderBy: { order_index: 'asc' },
        select: { id: true, name: true, slug: true, icon: true, is_active: true, order_index: true, description: true },
      }),
      prisma.tabs.findMany({
        where: { is_active: true },
        orderBy: { order_index: 'asc' },
        select: {
          id: true,
          module_id: true,
          parent_tab_id: true,
          slug: true,
          name: true,
          description: true,
          order_index: true,
        },
      }),
      prisma.actions.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, slug: true, name: true, description: true },
      }),
    ]);

    type ActionItem = (typeof actions)[number];
    type TabItem = (typeof allTabs)[number] & { actions: ActionItem[]; subtabs: TabWithActions[] };
    type TabWithActions = Omit<TabItem, 'subtabs'> & { subtabs: TabWithActions[] };

    const findTabDefinition = (moduleSlug: string, tabSlug: string) => {
      const moduleDef = PERMISSIONS[moduleSlug as ModuleSlug];
      if (!moduleDef) return null;

      const tabDef = moduleDef.tabs[tabSlug as keyof typeof moduleDef.tabs];
      if (tabDef) return tabDef;

      for (const t of Object.values(moduleDef.tabs)) {
        if (
          (t as { subtabs?: Record<string, unknown> }).subtabs &&
          (t as { subtabs: Record<string, unknown> }).subtabs[tabSlug]
        ) {
          return (t as { subtabs: Record<string, unknown> }).subtabs[tabSlug];
        }
        if ((t as { subtabs?: Record<string, { subtabs?: Record<string, unknown> }> }).subtabs) {
          for (const st of Object.values(
            (t as { subtabs: Record<string, { subtabs?: Record<string, unknown> }> }).subtabs
          )) {
            if (st.subtabs && st.subtabs[tabSlug]) {
              return st.subtabs[tabSlug];
            }
          }
        }
      }
      return null;
    };

    const buildTabHierarchy = (parentId: string | null, moduleId: string, moduleSlug: string): TabWithActions[] => {
      return allTabs
        .filter((tab) => tab.module_id === moduleId && tab.parent_tab_id === parentId)
        .map((tab) => {
          const tabDefinition = findTabDefinition(moduleSlug, tab.slug);
          // Si la tab no está declarada en permissions-map o no tiene allowedActions,
          // NO mostramos acciones. Antes el fallback era "todas", lo cual permitía que
          // acciones custom (upload_private, view_all_requests, etc.) aparezcan en tabs
          // que nunca las declararon, contaminando role_permissions.
          const allowed = (tabDefinition as { allowedActions?: string[] } | null)?.allowedActions;
          const tabActions = allowed ? actions.filter((a) => allowed.includes(a.slug)) : [];
          return {
            ...tab,
            actions: tabActions,
            subtabs: buildTabHierarchy(tab.id, moduleId, moduleSlug),
          };
        });
    };

    return modules.map((module) => ({
      ...module,
      tabs: buildTabHierarchy(null, module.id, module.slug ?? ''),
    }));
  } catch (error) {
    logger.error('Error al obtener módulos con tabs', { data: { error } });
    throw error;
  }
}

/**
 * Obtiene los usuarios de la empresa actual con estado de asignación al rol dado.
 * Reemplaza getUsersWithRoleStatus de actions.ts (supabaseBrowser + document.cookie).
 */
export async function getUsersForRoleAssignment(roleId: number) {
  logger.debug('Obteniendo usuarios para asignación de rol', { data: { roleId } });

  const session = await getCachedSession();
  const companyId = session?.user?.app_metadata?.company as string | undefined;

  if (!companyId) {
    throw new Error('No hay empresa seleccionada');
  }

  try {
    // 1. Obtener usuarios de la empresa a través de share_company_users → profile
    const shareUsers = await prisma.share_company_users.findMany({
      where: { company_id: companyId, is_active: true },
      select: {
        id: true,
        profile: {
          select: {
            id: true,
            fullname: true,
            email: true,
            credential_id: true,
          },
        },
      },
    });

    // 2. Obtener credential_ids que tienen este rol
    const userRoles = await prisma.user_roles.findMany({
      where: { role_id: BigInt(roleId) },
      select: { user_id: true },
    });
    const usersWithRole = new Set(userRoles.map((ur) => ur.user_id));

    // 3. Mapear resultados
    return shareUsers
      .filter((su) => su.profile !== null)
      .map((su) => ({
        userId: su.id, // ID de share_company_users para link
        credentialId: su.profile!.credential_id ?? su.profile!.id, // credential_id para operaciones de roles
        userName: su.profile!.fullname ?? 'Sin nombre',
        userEmail: su.profile!.email ?? 'Sin email',
        hasRole: usersWithRole.has(su.profile!.credential_id ?? ''),
      }));
  } catch (error) {
    logger.error('Error al obtener usuarios para asignación de rol', { data: { error, roleId } });
    throw error;
  }
}

// ─── Mutation Actions ─────────────────────────────────────────────────────────

/**
 * Crea un nuevo rol con sus permisos en una sola transacción.
 */
export async function createRoleWithPermissions(data: {
  name: string;
  description?: string;
  color?: string;
  permissions: Array<{ tabId: string; actionId: string }>;
}) {
  logger.debug('Creando rol con permisos', { data: { name: data.name, permissionsCount: data.permissions.length } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newRole = await tx.roles.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          color: data.color ?? null,
          is_active: true,
          is_system: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          is_system: true,
          is_active: true,
          slug: true,
          intern: true,
        },
      });

      if (data.permissions.length > 0) {
        await tx.role_permissions.createMany({
          data: data.permissions.map((perm) => ({
            role_id: newRole.id,
            tab_id: perm.tabId,
            action_id: perm.actionId,
          })),
          skipDuplicates: true,
        });
      }

      return { ...newRole, id: Number(newRole.id) };
    });

    return result;
  } catch (error) {
    logger.error('Error al crear rol', { data: { error, name: data.name } });
    // Manejar error de nombre duplicado
    if ((error as { code?: string }).code === 'P2002') {
      throw new Error(`Ya existe un rol con el nombre "${data.name}". Por favor, elige un nombre diferente.`);
    }
    throw error;
  }
}

/**
 * Actualiza un rol existente y reemplaza sus permisos en una sola transacción.
 */
export async function updateRoleWithPermissions(data: {
  id: number;
  name: string;
  description?: string;
  color?: string;
  permissions: Array<{ tabId: string; actionId: string }>;
}) {
  logger.debug('Actualizando rol con permisos', { data: { id: data.id, name: data.name } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedRole = await tx.roles.update({
        where: { id: BigInt(data.id), is_system: false },
        data: {
          name: data.name,
          description: data.description ?? null,
          color: data.color ?? null,
          updated_at: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          is_system: true,
          is_active: true,
          slug: true,
          intern: true,
        },
      });

      // Reemplazar permisos: delete + createMany
      await tx.role_permissions.deleteMany({
        where: { role_id: BigInt(data.id) },
      });

      if (data.permissions.length > 0) {
        await tx.role_permissions.createMany({
          data: data.permissions.map((perm) => ({
            role_id: updatedRole.id,
            tab_id: perm.tabId,
            action_id: perm.actionId,
          })),
          skipDuplicates: true,
        });
      }

      return { ...updatedRole, id: Number(updatedRole.id) };
    });

    return result;
  } catch (error) {
    logger.error('Error al actualizar rol', { data: { error, id: data.id } });
    if ((error as { code?: string }).code === 'P2002') {
      throw new Error(`Ya existe un rol con el nombre "${data.name}". Por favor, elige un nombre diferente.`);
    }
    throw error;
  }
}

/**
 * Elimina un rol (solo roles no-sistema).
 */
export async function deleteRoleServer(roleId: number) {
  logger.debug('Eliminando rol', { data: { roleId } });

  try {
    // Verificar que no sea un rol del sistema
    const role = await prisma.roles.findUnique({
      where: { id: BigInt(roleId) },
      select: { is_system: true },
    });

    if (role?.is_system) {
      throw new Error('No se pueden eliminar roles del sistema');
    }

    await prisma.roles.delete({
      where: { id: BigInt(roleId) },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al eliminar rol', { data: { error, roleId } });
    throw error;
  }
}

/**
 * Asigna un rol a un usuario.
 */
export async function assignRoleToUserServer(userId: string, roleId: number) {
  logger.debug('Asignando rol a usuario', { data: { userId, roleId } });

  const session = await getCachedSession();
  const assignedBy = session?.user?.id ?? null;

  try {
    await prisma.user_roles.create({
      data: {
        user_id: userId,
        role_id: BigInt(roleId),
        assigned_by: assignedBy,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al asignar rol a usuario', { data: { error, userId, roleId } });
    if ((error as { code?: string }).code === 'P2002') {
      // Ya tiene el rol asignado — idempotente, no es error real
      return { success: true };
    }
    throw error;
  }
}

/**
 * Remueve un rol de un usuario.
 */
export async function removeRoleFromUserServer(userId: string, roleId: number) {
  logger.debug('Removiendo rol de usuario', { data: { userId, roleId } });

  try {
    await prisma.user_roles.deleteMany({
      where: {
        user_id: userId,
        role_id: BigInt(roleId),
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al remover rol de usuario', { data: { error, userId, roleId } });
    throw error;
  }
}

// ─── User Permissions (custom) ────────────────────────────────────────────────

/**
 * Obtiene los permisos custom de un usuario (reemplaza RPC get_user_permissions).
 * Combina permisos de roles y permisos personalizados en el mismo formato que el RPC.
 * Formato de retorno: { tab_id, action_id, module_slug, tab_slug, action_slug, is_granted, source, role_id, role_name, role_color }
 */
export async function getUserPermissionsServer(userId: string) {
  logger.debug('Obteniendo permisos del usuario', { data: { userId } });

  try {
    // 1. Permisos de roles asignados al usuario
    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: userId },
      include: {
        roles: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    const roleIds = userRoles.map((ur) => ur.role_id);

    const rolePermissions =
      roleIds.length > 0
        ? await prisma.role_permissions.findMany({
            where: { role_id: { in: roleIds } },
            include: {
              tabs: {
                select: { id: true, slug: true, modules: { select: { slug: true } } },
              },
              actions: { select: { id: true, slug: true } },
              roles: { select: { id: true, name: true, color: true } },
            },
          })
        : [];

    // 2. Permisos personalizados del usuario
    const customPerms = await prisma.user_permissions.findMany({
      where: { user_id: userId },
      include: {
        tabs: {
          select: { id: true, slug: true, modules: { select: { slug: true } } },
        },
        actions: { select: { id: true, slug: true } },
      },
    });

    // Construir el mapa combinado (custom overrides role)
    type PermEntry = {
      tab_id: string;
      action_id: string;
      module_slug: string | null;
      tab_slug: string;
      action_slug: string;
      is_granted: boolean;
      source: 'role' | 'custom';
      role_id: number | null;
      role_name: string | null;
      role_color: string | null;
    };

    const permMap = new Map<string, PermEntry>();

    // Primero agregar permisos de rol
    for (const rp of rolePermissions) {
      const key = `${rp.tab_id}:${rp.action_id}`;
      permMap.set(key, {
        tab_id: rp.tab_id,
        action_id: rp.action_id,
        module_slug: rp.tabs?.modules?.slug ?? null,
        tab_slug: rp.tabs?.slug ?? '',
        action_slug: rp.actions?.slug ?? '',
        is_granted: true,
        source: 'role',
        role_id: Number(rp.role_id),
        role_name: rp.roles?.name ?? null,
        role_color: rp.roles?.color ?? null,
      });
    }

    // Luego custom (overrides)
    for (const cp of customPerms) {
      const key = `${cp.tab_id}:${cp.action_id}`;
      permMap.set(key, {
        tab_id: cp.tab_id,
        action_id: cp.action_id,
        module_slug: cp.tabs?.modules?.slug ?? null,
        tab_slug: cp.tabs?.slug ?? '',
        action_slug: cp.actions?.slug ?? '',
        is_granted: cp.is_granted ?? true,
        source: 'custom',
        role_id: null,
        role_name: null,
        role_color: null,
      });
    }

    return Array.from(permMap.values());
  } catch (error) {
    logger.error('Error al obtener permisos del usuario', { data: { error, userId } });
    throw error;
  }
}

export type UserPermissionsData = Awaited<ReturnType<typeof getUserPermissionsServer>>;
export type UserPermissionEntry = UserPermissionsData[number];

/**
 * Obtiene los roles asignados a un usuario (reemplaza getUserRoles de supabaseBrowser).
 */
export async function getUserRolesServer(userId: string) {
  logger.debug('Obteniendo roles del usuario', { data: { userId } });

  try {
    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: userId },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            is_system: true,
            is_active: true,
            slug: true,
          },
        },
      },
      orderBy: { assigned_at: 'asc' },
    });

    // Serializar BigInt
    return userRoles.map((ur) => ({
      id: ur.id,
      user_id: ur.user_id,
      role_id: Number(ur.role_id),
      assigned_by: ur.assigned_by,
      assigned_at: ur.assigned_at,
      roles: ur.roles
        ? {
            ...ur.roles,
            id: Number(ur.roles.id),
          }
        : null,
    }));
  } catch (error) {
    logger.error('Error al obtener roles del usuario', { data: { error, userId } });
    throw error;
  }
}

export type UserRolesData = Awaited<ReturnType<typeof getUserRolesServer>>;
export type UserRoleEntry = UserRolesData[number];

/**
 * Obtiene el detalle de un usuario por su share_company_users.id (para la página de detalle).
 * Reemplaza getUsersbyId de src/app/server/GET/actions.ts.
 */
export async function getUserDetailById(shareUserId: string) {
  logger.debug('Obteniendo detalle de usuario', { data: { shareUserId } });

  const session = await getCachedSession();
  const companyId = session?.user?.app_metadata?.company as string | undefined;

  if (!companyId) {
    throw new Error('No hay empresa seleccionada');
  }

  try {
    const shareUser = await prisma.share_company_users.findFirst({
      where: { id: shareUserId, company_id: companyId },
      include: {
        profile: {
          select: {
            id: true,
            fullname: true,
            email: true,
            avatar: true,
            credential_id: true,
            employee_id: true,
            employees: {
              select: {
                id: true,
                full_name: true,
                file: true,
                picture: true,
              },
            },
          },
        },
      },
    });

    return shareUser;
  } catch (error) {
    logger.error('Error al obtener detalle de usuario', { data: { error, shareUserId } });
    throw error;
  }
}

export type UserDetailData = Awaited<ReturnType<typeof getUserDetailById>>;

/**
 * Establece (upsert) un permiso custom de usuario.
 * Reemplaza setUserPermission de Permissions/actions.ts (supabaseBrowser).
 */
export async function setUserPermissionServer(userId: string, tabId: string, actionId: string, isGranted: boolean) {
  logger.debug('Seteando permiso de usuario', { data: { userId, tabId, actionId, isGranted } });

  const session = await getCachedSession();
  const assignedBy = session?.user?.id ?? null;

  try {
    await prisma.user_permissions.upsert({
      where: { user_id_tab_id_action_id: { user_id: userId, tab_id: tabId, action_id: actionId } },
      create: {
        user_id: userId,
        tab_id: tabId,
        action_id: actionId,
        is_granted: isGranted,
        assigned_by: assignedBy,
      },
      update: {
        is_granted: isGranted,
        assigned_by: assignedBy,
        updated_at: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al setear permiso de usuario', { data: { error, userId, tabId, actionId } });
    throw error;
  }
}

/**
 * Remueve un permiso custom de usuario.
 * Reemplaza removeUserPermission de Permissions/actions.ts (supabaseBrowser).
 */
export async function removeUserPermissionServer(userId: string, tabId: string, actionId: string) {
  logger.debug('Removiendo permiso de usuario', { data: { userId, tabId, actionId } });

  try {
    await prisma.user_permissions.deleteMany({
      where: { user_id: userId, tab_id: tabId, action_id: actionId },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al remover permiso de usuario', { data: { error, userId, tabId, actionId } });
    throw error;
  }
}

/**
 * Elimina TODOS los permisos custom de un usuario.
 */
export async function cleanUserCustomPermissions(userId: string) {
  logger.debug('Limpiando permisos custom del usuario', { data: { userId } });

  try {
    await prisma.user_permissions.deleteMany({
      where: { user_id: userId },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al limpiar permisos custom del usuario', { data: { error, userId } });
    throw error;
  }
}

/**
 * Elimina TODOS los permisos custom y roles de un usuario en una transacción.
 */
export async function cleanAllUserPermissionsAndRoles(userId: string) {
  logger.debug('Limpiando todos los permisos y roles del usuario', { data: { userId } });

  try {
    await prisma.$transaction([
      prisma.user_permissions.deleteMany({ where: { user_id: userId } }),
      prisma.user_roles.deleteMany({ where: { user_id: userId } }),
    ]);

    return { success: true };
  } catch (error) {
    logger.error('Error al limpiar todos los permisos y roles del usuario', { data: { error, userId } });
    throw error;
  }
}
