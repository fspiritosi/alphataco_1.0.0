import { getUserAccessibleModulesServer } from '@/features/Permissions';
import { getCurrentPath } from '@/shared/actions/actions.navbar';
import { cookies } from 'next/headers';
import { Sidebar } from './components/Sidebar';

/**
 * Server Component del Sidebar
 *
 * Responsabilidades:
 * - Fetch de permisos en el servidor
 * - Obtener pathname inicial para SSR
 * - Pasar datos al componente cliente
 *
 * Nota: El pathname inicial se usa solo para la primera carga (SSR).
 * El componente cliente se sincroniza automáticamente con usePathname()
 * en navegaciones posteriores.
 */
async function SidebarFeat() {
  // Fetch en servidor
  const initialPathname = await getCurrentPath();
  const accessibleModules = await getUserAccessibleModulesServer();
  const isActive = (await cookies()).get('sidebar_state')?.value;

  // Pasar pathname inicial y datos necesarios al cliente
  return <Sidebar initialPathname={initialPathname} accessibleModules={accessibleModules} isActive={isActive} />;
}

export default SidebarFeat;
