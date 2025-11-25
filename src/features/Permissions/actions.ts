import { supabaseBrowser } from '@/lib/supabase/browser';
import { Database } from '../../../database.types';

type Module = Database['public']['Tables']['modules']['Row'];
type Tab = Database['public']['Tables']['tabs']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];

export interface ModuleWithTabs extends Module {
  tabs: (Tab & { actions: Action[] })[];
}

/**
 * Obtiene todos los módulos con sus tabs y acciones disponibles
 * Estructura jerárquica: Módulos > Tabs principales > Subtabs > Acciones
 */
export async function getModulesWithTabs() {
  const supabase = supabaseBrowser();

  const [modulesResult, tabsResult, actionsResult] = await Promise.all([
    supabase.from('modules').select('*').eq('is_active', true).order('order_index'),
    supabase.from('tabs').select('*').eq('is_active', true).order('order_index'),
    supabase.from('actions').select('*').order('name'),
  ]);

  const modules = modulesResult.data || [];
  const allTabs = tabsResult.data || [];
  const actions = actionsResult.data || [];

  // Función recursiva para construir la jerarquía de tabs
  const buildTabHierarchy = (parentId: string | null, moduleId: string): any[] => {
    return allTabs
      .filter((tab) => tab.module_id === moduleId && tab.parent_tab_id === parentId)
      .map((tab) => ({
        ...tab,
        actions,
        subtabs: buildTabHierarchy(tab.id, moduleId), // Recursivamente obtener subtabs
      }));
  };

  // Construir estructura jerárquica
  return modules.map((module) => ({
    ...module,
    tabs: buildTabHierarchy(null, module.id), // Solo tabs principales (parent_tab_id = null)
  }));
}
export type getModulesWithTabsType = Awaited<ReturnType<typeof getModulesWithTabs>>;

/**
 * Obtiene todos los permisos de un usuario (combinando roles y permisos personalizados)
 * Obtiene el userId automáticamente desde los claims de Supabase
 */
export async function getUserPermissions() {
  const supabase = supabaseBrowser();

  // Obtener el userId desde los claims
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error fetching user permissions:', error);
    throw new Error('Failed to fetch user permissions');
  }

  // Ensure serializable data
  return data;
}

export type getUserPermissionsType = Awaited<ReturnType<typeof getUserPermissions>>;

/**
 * Obtiene los permisos de un usuario específico (por userId)
 * Útil para gestión de permisos de otros usuarios
 */
export async function getUserPermissionsByUserId(userId: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user permissions:', error);
    throw new Error('Failed to fetch user permissions');
  }

  return data || [];
}

export type getUserPermissionsByUserIdType = Awaited<ReturnType<typeof getUserPermissionsByUserId>>;

/**
 * Verifica si un usuario tiene un permiso específico
 * Obtiene el userId automáticamente desde los claims de Supabase
 */
export async function checkUserPermission(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<boolean> {
  const supabase = supabaseBrowser();

  // Obtener el userId desde los claims
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
    return false;
  }

  const { data, error } = await supabase.rpc('user_has_permission', {
    p_user_id: user.id,
    p_module_slug: moduleSlug,
    p_tab_slug: tabSlug,
    p_action_slug: actionSlug,
  });

  if (error) {
    console.error('Error checking user permission:', error);
    return false;
  }

  return data || false;
}

/**
 * Obtiene los módulos accesibles para un usuario
 * Obtiene el userId automáticamente desde los claims de Supabase
 */
export async function getUserAccessibleModules() {
  const supabase = supabaseBrowser();

  // Obtener el userId desde los claims
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_user_accessible_modules', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error fetching accessible modules:', error);
    throw new Error('Failed to fetch accessible modules');
  }

  // Ensure serializable data
  return data;
}

/**
 * Asigna un rol a un usuario
 */
export async function assignRoleToUser(userId: string, roleId: number, assignedBy?: string) {
  const supabase = supabaseBrowser();

  const { error } = await supabase.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    assigned_by: assignedBy || null,
  });

  if (error) {
    console.error('Error assigning role to user:', error);
    throw new Error('Failed to assign role to user');
  }

  return { success: true };
}

/**
 * Remueve un rol de un usuario
 */
export async function removeRoleFromUser(userId: string, roleId: number) {
  const supabase = supabaseBrowser();

  const { error } = await supabase.from('user_roles').delete().match({
    user_id: userId,
    role_id: roleId,
  });

  if (error) {
    console.error('Error removing role from user:', error);
    throw new Error('Failed to remove role from user');
  }

  return { success: true };
}

/**
 * Establece un permiso personalizado para un usuario
 */
export async function setUserPermission(
  userId: string,
  tabId: string,
  actionId: string,
  isGranted: boolean,
  assignedBy?: string
) {
  const supabase = supabaseBrowser();

  const { error } = await supabase.from('user_permissions').upsert(
    {
      user_id: userId,
      tab_id: tabId,
      action_id: actionId,
      is_granted: isGranted,
      assigned_by: assignedBy || null,
    },
    {
      onConflict: 'user_id,tab_id,action_id',
    }
  );

  if (error) {
    console.error('Error setting user permission:', error);
    throw new Error('Failed to set user permission');
  }

  return { success: true };
}

/**
 * Remueve un permiso personalizado de un usuario
 */
export async function removeUserPermission(userId: string, tabId: string, actionId: string) {
  const supabase = supabaseBrowser();

  const { error } = await supabase.from('user_permissions').delete().match({
    user_id: userId,
    tab_id: tabId,
    action_id: actionId,
  });

  if (error) {
    console.error('Error removing user permission:', error);
    throw new Error('Failed to remove user permission');
  }

  return { success: true };
}

/**
 * Requiere que un usuario tenga un permiso específico, lanza error si no lo tiene
 * Obtiene el userId automáticamente desde los claims de Supabase
 */
export async function requirePermission(moduleSlug: string, tabSlug: string, actionSlug: string) {
  const hasPermission = await checkUserPermission(moduleSlug, tabSlug, actionSlug);

  if (!hasPermission) {
    throw new Error(`Permission denied: User does not have ${actionSlug} permission on ${moduleSlug}/${tabSlug}`);
  }
}

/**
 * Obtiene todos los roles disponibles
 */
export async function getRoles() {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.from('roles').select('*').eq('is_active', true).order('name');

  if (error) {
    console.error('Error fetching roles:', error);
    throw new Error('Failed to fetch roles');
  }

  // Ensure serializable data
  return data;
}

export type getRolesType = Awaited<ReturnType<typeof getRoles>>;

/**
 * Obtiene los roles asignados a un usuario
 */
export async function getUserRoles(userId: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.from('user_roles').select('*, roles(*)').eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    throw new Error('Failed to fetch user roles');
  }

  // Ensure serializable data
  return data;
}
export type getUserRolesType = Awaited<ReturnType<typeof getUserRoles>>;

/**
 * Obtiene los permisos de un rol específico con información de tabs y acciones
 */
export async function getRolePermissions(roleId: number) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('role_permissions')
    .select('*, tabs(*), actions(*)')
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role permissions:', error);
    throw new Error('Failed to fetch role permissions');
  }

  return data || [];
}

/**
 * Crea un nuevo rol
 */
export async function createRole(name: string, description?: string, color?: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('roles')
    .insert({
      name,
      description,
      color,
      is_active: true,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating role:', error);
    throw new Error('Failed to create role');
  }

  return JSON.parse(JSON.stringify(data));
}

/**
 * Actualiza un rol existente
 */
export async function updateRole(roleId: number, name: string, description?: string, color?: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('roles')
    .update({
      name,
      description,
      color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roleId)
    .eq('is_system', false) // Solo permitir editar roles no del sistema
    .select()
    .single();

  if (error) {
    console.error('Error updating role:', error);
    throw new Error('Failed to update role');
  }

  return JSON.parse(JSON.stringify(data));
}

/**
 * Elimina un rol
 */
export async function deleteRole(roleId: number) {
  const supabase = supabaseBrowser();

  // Verificar que no sea un rol del sistema
  const { data: role } = await supabase.from('roles').select('is_system').eq('id', roleId).single();

  if (role?.is_system) {
    throw new Error('Cannot delete system roles');
  }

  const { error } = await supabase.from('roles').delete().eq('id', roleId);

  if (error) {
    console.error('Error deleting role:', error);
    throw new Error('Failed to delete role');
  }

  return { success: true };
}

/**
 * Establece los permisos de un rol (reemplaza todos los permisos existentes)
 */
export async function setRolePermissions(roleId: number, permissions: Array<{ tabId: string; actionId: string }>) {
  const supabase = supabaseBrowser();

  // Primero eliminar todos los permisos existentes del rol
  await supabase.from('role_permissions').delete().eq('role_id', roleId);

  // Luego insertar los nuevos permisos
  if (permissions.length > 0) {
    const records = permissions.map((perm) => ({
      role_id: roleId,
      tab_id: perm.tabId,
      action_id: perm.actionId,
    }));

    const { error } = await supabase.from('role_permissions').insert(records);

    if (error) {
      console.error('Error setting role permissions:', error);
      throw new Error('Failed to set role permissions');
    }
  }

  return { success: true };
}

/**
 * Obtiene el conteo de usuarios por cada rol
 * Retorna un objeto con roleId como clave y cantidad de usuarios como valor
 */
export async function getRoleUserCounts() {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.from('user_roles').select('role_id');

  if (error) {
    console.error('Error fetching role user counts:', error);
    throw new Error('Failed to fetch role user counts');
  }

  // Contar usuarios por rol
  const counts = new Map<number, number>();
  data?.forEach((ur) => {
    counts.set(ur.role_id, (counts.get(ur.role_id) || 0) + 1);
  });

  // Convertir a objeto para serialización
  return Object.fromEntries(counts);
}

/**
 * Obtiene todos los usuarios de la empresa actual con indicador de si tienen un rol específico
 */
export async function getUsersWithRoleStatus(roleId: number) {
  const supabase = supabaseBrowser();

  // Obtener company_id desde cookies
  const cookies = document.cookie.split('; ').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.split('=');
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );
  const companyId = cookies['actualComp'];

  if (!companyId) {
    throw new Error('No company selected');
  }

  // Obtener todos los usuarios compartidos en la empresa actual
  const { data: users, error: usersError } = await supabase
    .from('share_company_users')
    .select('id, profile_id')
    .eq('company_id', companyId);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw new Error('Failed to fetch users');
  }

  // Obtener información de los profiles
  const profileIds = users?.map((u) => u.profile_id).filter(Boolean) || [];

  if (profileIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profile')
    .select('id, fullname, email, credential_id')
    .in('id', profileIds);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw new Error('Failed to fetch profiles');
  }

  // Crear un mapa de profile_id a share_company_users.id
  const profileToShareUserId = new Map(users?.map((u) => [u.profile_id, u.id]) || []);

  // Obtener usuarios que tienen este rol (user_roles usa credential_id)
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role_id', roleId);

  if (rolesError) {
    console.error('Error fetching user roles:', rolesError);
    throw new Error('Failed to fetch user roles');
  }

  const usersWithRole = new Set(userRoles?.map((ur) => ur.user_id) || []);

  return (
    profiles?.map((profile) => ({
      userId: profileToShareUserId.get(profile.id) || profile.id, // ID de share_company_users para el link
      credentialId: profile.credential_id, // credential_id para operaciones de roles
      userName: profile.fullname || 'Sin nombre',
      userEmail: profile.email || 'Sin email',
      hasRole: usersWithRole.has(profile.credential_id!), // user_roles usa credential_id
    })) || []
  );
}
