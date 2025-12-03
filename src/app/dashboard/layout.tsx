// import { AlertComponent } from '@/components/AlertComponent'
// import SideBarContainer from '@/components/SideBarContainer';
import { FilterCleanupInitializer } from '@/components/FilterCleanupInitializer';
import { PasswordChangeAlertWrapper } from '@/components/PasswordChangeAlertWrapper';
import { PermissionsProvider } from '@/components/PermissionsProvider';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { Inter } from 'next/font/google';
import '../globals.css';
import TanstackQueryInicializador from './TanstackQueryInicializador';
const font = Inter({ subsets: ['latin'] });

/**
 * DashboardLayout - Layout principal del dashboard
 *
 * OPTIMIZACIÓN: Obtiene permisos UNA VEZ aquí y los pre-carga en cache.
 *
 * IMPORTANTE: Los permisos se obtienen UNA VEZ en el layout y se pre-cargan en el cache de React.
 * Todos los componentes hijos que usen getUserPermissionsMapServer() compartirán el mismo cache,
 * evitando múltiples queries.
 *
 * Para pasar permisos explícitamente como prop, los componentes deben obtenerlos y pasarlos
 * a TabsManagerServer. El cache asegura que solo se haga UNA query incluso si múltiples
 * componentes obtienen permisos.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Obtener permisos UNA VEZ en el layout para pre-cargar el cache
  // Esto asegura que si múltiples componentes llaman a getUserPermissionsMapServer(),
  // solo se hará UNA query a la base de datos
  await getUserPermissionsMapServer();

  return (
    <div className={`grid grid-rows-[auto,1fr] grid-cols-[auto,1fr] h-screen `} suppressHydrationWarning>
      <FilterCleanupInitializer />
      <div className="row-span-2 ">
        <SidebarFeat />
      </div>
      <div className="border-r border-b border-muted/50 dark:bg-slate-950 mb-2">
        {/* <NavBar /> */}
        <NavbarFeat />
      </div>
      <TanstackQueryInicializador>
        <PasswordChangeAlertWrapper />
        <PermissionsProvider>
          <div className="px-6">{children}</div>
        </PermissionsProvider>
      </TanstackQueryInicializador>
    </div>
  );
}
