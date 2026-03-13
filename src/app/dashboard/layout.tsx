import { PasswordChangeAlertWrapper } from '@/components/PasswordChangeAlertWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { Suspense } from 'react';
import TanstackQueryInicializador from './TanstackQueryInicializador';

/**
 * DashboardLayout - Layout principal del dashboard
 *
 * Sidebar and Navbar are wrapped in Suspense because they access cookies()
 * for auth/permissions, which is incompatible with Next.js 16 prerendering
 * outside of Suspense boundaries when cacheComponents is enabled.
 *
 * Permissions are fetched by individual pages/components that need them.
 * React cache() deduplicates calls within the same request automatically.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-rows-[auto_1fr] grid-cols-[auto_1fr]" suppressHydrationWarning>
      <div className="row-span-2">
        <Suspense fallback={<Skeleton className="h-screen w-16" />}>
          <SidebarFeat />
        </Suspense>
      </div>
      <div className="border-r border-b border-muted/50 dark:bg-slate-950 mb-2">
        <Suspense fallback={<Skeleton className="h-14 w-full" />}>
          <NavbarFeat />
        </Suspense>
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
