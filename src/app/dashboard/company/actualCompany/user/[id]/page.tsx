import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import {
  getAllRolePermissions,
  getAllRolesWithCounts,
  getModulesWithTabsServer,
  getUserDetailById,
  getUserPermissionsServer,
  getUserRolesServer,
} from '@/features/UserPermissionsManager/actions.server';
import { UserPermissionsManager } from '@/features/UserPermissionsManager/UserPermissionsManager';

async function User({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  // Verificar permisos de view y update en paralelo con la carga de datos
  const [canView, canUpdate, shareUser] = await Promise.all([
    checkPermissionServer('empresa', 'detalle-usuario', 'view'),
    checkPermissionServer('empresa', 'detalle-usuario', 'update'),
    getUserDetailById(resolvedParams.id),
  ]);

  if (!canView) {
    return (
      <section className="md:mx-7 py-4">
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground font-medium">Sin acceso</p>
            <p className="text-sm text-muted-foreground">No tienes permisos para ver esta sección.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!shareUser) {
    return (
      <section className="md:mx-7 py-4">
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground font-medium">Usuario no encontrado</p>
            <p className="text-sm text-muted-foreground">
              El usuario solicitado no existe o no pertenece a esta empresa.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // El ID que se usa en user_roles y user_permissions es el credential_id (UUID de auth)
  const authUserId = shareUser.profile?.credential_id ?? shareUser.profile?.id ?? resolvedParams.id;
  const userName = shareUser.profile?.fullname ?? '';
  const userEmail = shareUser.profile?.email ?? '';

  // Cargar datos iniciales en paralelo para SSR
  const [initialUserPermissions, initialUserRoles, initialRoles, initialRolePermissions, initialModules] =
    await Promise.all([
      getUserPermissionsServer(authUserId),
      getUserRolesServer(authUserId),
      getAllRolesWithCounts(),
      getAllRolePermissions(),
      getModulesWithTabsServer(),
    ]);

  return (
    <section className="md:mx-7 py-4">
      <UserPermissionsManager
        userId={authUserId}
        userName={userName}
        userEmail={userEmail}
        canEdit={canUpdate}
        initialUserPermissions={initialUserPermissions}
        initialUserRoles={initialUserRoles}
        initialRoles={initialRoles}
        initialRolePermissions={initialRolePermissions}
        initialModules={initialModules}
      />
    </section>
  );
}

export default User;
