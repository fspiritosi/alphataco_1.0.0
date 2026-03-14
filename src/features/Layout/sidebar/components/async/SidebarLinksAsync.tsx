import { getUserAccessibleModulesServer } from '@/features/Permissions';
import { SidebarLinks } from '../SidebarLinks';

/**
 * Async Server Component — carga módulos accesibles y renderiza los links.
 * Se envuelve en Suspense desde SidebarFeat para streaming independiente.
 */
export async function SidebarLinksAsync() {
  const accessibleModules = await getUserAccessibleModulesServer();
  return <SidebarLinks accessibleModules={accessibleModules} />;
}
