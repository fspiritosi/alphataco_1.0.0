import { getUsersbyId } from '@/app/server/GET/actions';
import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import { UserPermissionsManager } from '@/features/UserPermissionsManager/UserPermissionsManager';

async function User({ params }: { params: { id: string } }) {
  const data: any = await getUsersbyId({ id: params.id });

  // El ID del usuario en auth.users es el credential_id del profile
  const authUserId = data[0]?.profile_id?.credential_id || params.id;

  // Verificar permisos de view y update
  const canView = await checkPermissionServer('empresa', 'detalle-usuario', 'view');
  const canUpdate = await checkPermissionServer('empresa', 'detalle-usuario', 'update');

  // Si no tiene permiso de view, mostrar placeholder de sin acceso
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

  return (
    <section className="md:mx-7 py-4">
      <UserPermissionsManager
        userId={authUserId}
        userName={data[0]?.profile_id?.fullname || ''}
        userEmail={data[0]?.profile_id?.email || ''}
        canEdit={canUpdate}
      />
    </section>
  );
}

export default User;
