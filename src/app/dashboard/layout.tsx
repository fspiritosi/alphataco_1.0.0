import { FilterCleanupInitializer } from '@/components/FilterCleanupInitializer';
import { PasswordChangeAlertWrapper } from '@/components/PasswordChangeAlertWrapper';
import { PermissionsProvider } from '@/components/PermissionsProvider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { cookies } from 'next/headers';
import '../globals.css';
import TanstackQueryInicializador from './TanstackQueryInicializador';

/**
 * DashboardLayout - Layout principal del dashboard
 *
 * Usa shadcn SidebarProvider + SidebarInset para el layout.
 * Lee la cookie `sidebar:state` server-side para persistir el estado colapsado.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await getUserPermissionsMapServer();

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar:state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarFeat />
      <SidebarInset className="bg-sidebar-accent">
        <FilterCleanupInitializer />
        <header className="bg-sidebar">
          <NavbarFeat />
        </header>
        <div className="flex flex-1 flex-col p-6">
          <TanstackQueryInicializador>
            <PasswordChangeAlertWrapper />
            <PermissionsProvider>{children}</PermissionsProvider>
          </TanstackQueryInicializador>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
