import { getCurrentUserProfile } from '../../actions/user-profile';
import { NavUser } from '../NavUser';

/** Roles que habilitan `/admin/panel`. Son los mismos que mostraban el botón "Panel" del navbar. */
const ADMIN_ROLES = ['Admin', 'Super Admin', 'Developer'];

/**
 * Async Server Component — carga el perfil de la sesión y renderiza el menú del footer.
 * Se envuelve en Suspense desde `AppSidebar` para streaming independiente.
 */
export async function NavUserAsync() {
  const user = await getCurrentUserProfile();

  return <NavUser user={user} isAdmin={!!user?.role && ADMIN_ROLES.includes(user.role)} />;
}
