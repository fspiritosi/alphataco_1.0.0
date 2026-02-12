import { getUserAccessibleModulesServer } from '@/features/Permissions';
import { getCurrentPath } from '@/shared/actions/actions.navbar';
import { Sidebar } from './components/Sidebar';

/**
 * Server Component del Sidebar
 *
 * Responsabilidades:
 * - Fetch de permisos en el servidor
 * - Obtener pathname inicial para SSR
 * - Pasar datos al componente cliente
 */
async function SidebarFeat() {
  const initialPathname = await getCurrentPath();
  const accessibleModules = await getUserAccessibleModulesServer();

  return <Sidebar initialPathname={initialPathname} accessibleModules={accessibleModules} />;
}

export default SidebarFeat;
