import { SupportTicketsRealtimeProvider } from '@/features/Ayuda/components/SupportTicketsRealtimeProvider';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { PasswordChangeAlertWrapper } from '@/shared/components/auth/PasswordChangeAlertWrapper';
import TanstackQueryInicializador from '@/shared/providers/TanstackQueryInicializador';
import { Suspense } from 'react';

/**
 * DashboardLayout - Layout principal del dashboard
 *
 * Sidebar y Navbar renderizan su shell estático INSTANTÁNEAMENTE.
 * Las partes dinámicas (links, company selector, user menu) se cargan
 * por streaming independiente con Suspense granular DENTRO de cada componente.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-rows-[auto_1fr] grid-cols-[auto_1fr]" suppressHydrationWarning>
      <div className="row-span-2">
        <SidebarFeat />
      </div>
      <div className="border-r border-b border-muted/50 dark:bg-slate-950 mb-2">
        <NavbarFeat />
      </div>
      <div className="min-h-0 overflow-y-auto">
        <TanstackQueryInicializador>
          <SupportTicketsRealtimeProvider>
            <Suspense fallback={null}>
              <PasswordChangeAlertWrapper />
            </Suspense>
            <div className="px-6 pb-4">{children}</div>
          </SupportTicketsRealtimeProvider>
        </TanstackQueryInicializador>
      </div>
    </div>
  );
}
