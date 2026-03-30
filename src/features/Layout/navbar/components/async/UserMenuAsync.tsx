import { Button } from '@/components/ui/button';
import { getCurrentUserProfile } from '../../actions/actions.navbar';
import { _UserMenu } from '../ui/_UserMenu';

/**
 * Async Server Component — carga perfil del usuario y renderiza el menu + admin button.
 * Se envuelve en Suspense desde NavbarFeat para streaming independiente.
 */
export async function UserMenuAsync() {
  const user = await getCurrentUserProfile();

  return (
    <>
      {user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Developer' ? (
        <Button variant="default" asChild>
          <a href="/admin/panel">Panel</a>
        </Button>
      ) : null}
      <_UserMenu user={user} />
    </>
  );
}
