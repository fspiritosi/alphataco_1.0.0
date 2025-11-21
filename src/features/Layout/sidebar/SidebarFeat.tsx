import { getUserAccessibleModulesServer } from '@/features/Permissions';
import { getCurrentPath } from '@/shared/actions/actions.navbar';
import { cookies } from 'next/headers';
import { Sidebar } from './components/Sidebar';

/**
 * Server Component del Sidebar
 *
 * Responsabilidades:
 * - Fetch de permisos en el servidor
 * - Obtener pathname actual
 * - Pasar datos al componente cliente
 */
async function SidebarFeat() {
  // Fetch en servidor
  const pathname = await getCurrentPath();
  const accessibleModules = await getUserAccessibleModulesServer();
  const isActive = cookies().get('sidebar_state')?.value;

  // Pasar solo datos necesarios al cliente
  return <Sidebar pathname={pathname} accessibleModules={accessibleModules} isActive={isActive} />;
}

export default SidebarFeat;
