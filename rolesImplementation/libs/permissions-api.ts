import { getSupabaseBrowserClient } from './supabase-client';
import type {
  Action,
  Module,
  ModuleWithTabs,
  Role,
  RolePermission,
  Tab,
  UserPermission,
  UserPermissionSummary,
  UserRole,
} from './types';

const supabase = getSupabaseBrowserClient();

// =====================================================
// MÓDULOS
// =====================================================

export async function getModules(): Promise<ModuleWithTabs[]> {
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (modulesError) throw modulesError;

  const { data: tabs, error: tabsError } = await supabase
    .from('tabs')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (tabsError) throw tabsError;

  const { data: actions, error: actionsError } = await supabase.from('actions').select('*').order('name');

  if (actionsError) throw actionsError;

  // Agrupar tabs por módulo y agregar todas las acciones a cada tab
  const modulesWithTabs: ModuleWithTabs[] = (modules || []).map((module) => ({
    ...module,
    tabs: (tabs || [])
      .filter((tab) => tab.module_id === module.id)
      .map((tab) => ({
        ...tab,
        actions: actions || [],
      })),
  }));

  return modulesWithTabs;
}

export async function getModuleById(id: string): Promise<Module | null> {
  const { data, error } = await supabase.from('modules').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

// =====================================================
// TABS
// =====================================================

export async function getTabsByModuleId(moduleId: string): Promise<Tab[]> {
  const { data, error } = await supabase
    .from('tabs')
    .select('*')
    .eq('module_id', moduleId)
    .eq('is_active', true)
    .order('order_index');

  if (error) throw error;
  return data || [];
}

// =====================================================
// ACCIONES
// =====================================================

export async function getActions(): Promise<Action[]> {
  const { data, error } = await supabase.from('actions').select('*').order('name');

  if (error) throw error;
  return data || [];
}

// =====================================================
// ROLES
// =====================================================

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').eq('is_active', true).order('name');

  if (error) throw error;
  return data || [];
}

export async function getRoleById(id: string): Promise<Role | null> {
  const { data, error } = await supabase.from('roles').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

export async function createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
  const { data, error } = await supabase.from('roles').insert(role).select().single();

  if (error) throw error;
  return data;
}

export async function updateRole(id: string, updates: Partial<Role>): Promise<Role> {
  const { data, error } = await supabase.from('roles').update(updates).eq('id', id).select().single();

  if (error) throw error;
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id).eq('is_system', false); // Solo permitir eliminar roles no del sistema

  if (error) throw error;
}

// =====================================================
// PERMISOS DE ROLES
// =====================================================

export async function getRolePermissions(roleId: string): Promise<RolePermission[]> {
  const { data, error } = await supabase.from('role_permissions').select('*').eq('role_id', roleId);

  if (error) throw error;
  return data || [];
}

export async function setRolePermissions(
  roleId: string,
  permissions: Array<{ tab_id: string; action_id: string }>
): Promise<void> {
  // Eliminar permisos existentes
  const { error: deleteError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);

  if (deleteError) throw deleteError;

  // Insertar nuevos permisos
  if (permissions.length > 0) {
    const { error: insertError } = await supabase.from('role_permissions').insert(
      permissions.map((p) => ({
        role_id: roleId,
        tab_id: p.tab_id,
        action_id: p.action_id,
      }))
    );

    if (insertError) throw insertError;
  }
}

// =====================================================
// ROLES DE USUARIOS
// =====================================================

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function assignRoleToUser(userId: string, roleId: string, assignedBy?: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);

  if (error) throw error;
}

export async function setUserRoles(userId: string, roleIds: string[], assignedBy?: string): Promise<void> {
  // Eliminar roles existentes
  const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);

  if (deleteError) throw deleteError;

  // Insertar nuevos roles
  if (roleIds.length > 0) {
    const { error: insertError } = await supabase.from('user_roles').insert(
      roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
      }))
    );

    if (insertError) throw insertError;
  }
}

// =====================================================
// PERMISOS PERSONALIZADOS DE USUARIOS
// =====================================================

export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  const { data, error } = await supabase.from('user_permissions').select('*').eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function setUserPermission(
  userId: string,
  tabId: string,
  actionId: string,
  isGranted: boolean,
  assignedBy?: string
): Promise<UserPermission> {
  const { data, error } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      tab_id: tabId,
      action_id: actionId,
      is_granted: isGranted,
      assigned_by: assignedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeUserPermission(userId: string, tabId: string, actionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('tab_id', tabId)
    .eq('action_id', actionId);

  if (error) throw error;
}

// =====================================================
// FUNCIONES HELPER (usando las funciones SQL)
// =====================================================

export async function getAllUserPermissions(userId: string): Promise<UserPermissionSummary[]> {
  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data || [];
}

export async function checkUserPermission(
  userId: string,
  moduleSlug: string,
  tabSlug: string,
  actionSlug: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_permission', {
    p_user_id: userId,
    p_module_slug: moduleSlug,
    p_tab_slug: tabSlug,
    p_action_slug: actionSlug,
  });

  if (error) throw error;
  return data || false;
}

export async function getUserAccessibleModules(userId: string): Promise<Module[]> {
  const { data, error } = await supabase.rpc('get_user_accessible_modules', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data || [];
}

export async function getRolePermissionsSummary(roleId: string) {
  const { data, error } = await supabase.rpc('get_role_permissions_summary', {
    p_role_id: roleId,
  });

  if (error) throw error;
  return data || [];
}
