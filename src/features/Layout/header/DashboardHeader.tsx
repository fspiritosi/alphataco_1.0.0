import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/ui/ToogleDarkButton';
import { DashboardBreadcrumb } from '@/features/Layout/sidebar/components/DashboardBreadcrumb';
import { Suspense } from 'react';

/**
 * Header del dashboard, dentro del `SidebarInset` — es el header del bloque `sidebar-07`.
 *
 * Reemplaza al navbar: el hamburger pasó a ser `SidebarTrigger` (el estado lo maneja
 * `SidebarProvider`), y el selector de empresa y el menú de usuario se mudaron al sidebar.
 * Acá quedan las migas y el cambio de tema.
 *
 * El Suspense es obligatorio: `DashboardBreadcrumb` lee `useSearchParams` y con
 * `cacheComponents` activo Next exige el límite.
 */
export function DashboardHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Suspense fallback={null}>
          <DashboardBreadcrumb />
        </Suspense>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
