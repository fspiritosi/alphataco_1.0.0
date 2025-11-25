import { supabaseBrowser } from '@/lib/supabase/browser';
import { useQuery } from '@tanstack/react-query';

export const useUserRoles = (userId: string) => {
  return useQuery({
    queryKey: ['user-roles-permissions', userId],
    queryFn: () => fetchUserRolesAndPermissions(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export async function fetchUserRolesAndPermissions(userId: string) {
  const supabase = supabaseBrowser();

  // Fetch roles and permissions in parallel
  const [rolesResult, permissionsResult] = await Promise.all([
    supabase.from('user_roles').select('*, roles(id, name, color, description)').eq('user_id', userId),
    supabase
      .from('user_permissions')
      .select('id, tab_id, action_id, is_granted')
      .eq('user_id', userId)
      .eq('is_granted', true), // Only count granted permissions
  ]);

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  if (permissionsResult.error) {
    throw new Error(permissionsResult.error.message);
  }

  // Get role permissions count if user has a role
  let rolePermissionsCount = 0;
  if (rolesResult.data && rolesResult.data.length > 0) {
    const roleId = rolesResult.data[0].role_id;
    const rolePermissionsResult = await supabase
      .from('role_permissions')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', roleId);

    rolePermissionsCount = rolePermissionsResult.count || 0;
  }

  return {
    roles: rolesResult.data || [],
    customPermissions: permissionsResult.data || [],
    customPermissionsCount: permissionsResult.data?.length || 0,
    rolePermissionsCount,
  };
}
