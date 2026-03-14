import { PasswordChangeAlertWrapper } from '@/components/PasswordChangeAlertWrapper';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { Suspense } from 'react';
import TanstackQueryInicializador from './TanstackQueryInicializador';

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
          <Suspense fallback={null}>
            <PasswordChangeAlertWrapper />
          </Suspense>
          <div className="px-6 pb-4">{children}</div>
        </TanstackQueryInicializador>
      </div>
    </div>
  );
}
