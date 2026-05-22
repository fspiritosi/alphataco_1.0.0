import { getMyTicketsWithUnread } from '@/features/Ayuda/actions/support-tickets';
import { SupportTicketsRealtimeProvider } from '@/features/Ayuda/components/SupportTicketsRealtimeProvider';
import { MY_TICKETS_WITH_UNREAD_QUERY_KEY } from '@/features/Ayuda/hooks/queryKeys';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { PasswordChangeAlertWrapper } from '@/shared/components/auth/PasswordChangeAlertWrapper';
import TanstackQueryInicializador from '@/shared/providers/TanstackQueryInicializador';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Suspense } from 'react';

/**
 * DashboardLayout - Layout principal del dashboard
 *
 * Estructura para soportar Next.js 16 + cacheComponents:
 * - El shell (sidebar, navbar, content) se renderiza inmediato como fallback del Suspense.
 * - En paralelo, DashboardWithHydration hace prefetch server-side de los tickets sin leer
 *   y rehidrata el QueryClient. Cuando termina, el badge aparece sin nuevo fetch en cliente.
 * - Sin el Suspense, el `await prefetchQuery` bloquearía la navegación (Next.js 16 lo prohíbe).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TanstackQueryInicializador>
      <Suspense fallback={<DashboardLayoutShell>{children}</DashboardLayoutShell>}>
        <DashboardWithHydration>{children}</DashboardWithHydration>
      </Suspense>
    </TanstackQueryInicializador>
  );
}

async function DashboardWithHydration({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY,
      queryFn: () => getMyTicketsWithUnread(),
    });
  } catch {
    // Si el prefetch falla, el cliente igual reintenta vía useQuery
  }
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <DashboardLayoutShell>{children}</DashboardLayoutShell>
    </HydrationBoundary>
  );
}

function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <SupportTicketsRealtimeProvider>
      <div className="grid grid-rows-[auto_1fr] grid-cols-[auto_1fr]" suppressHydrationWarning>
        <div className="row-span-2">
          <SidebarFeat />
        </div>
        <div className="border-r border-b border-muted/50 dark:bg-slate-950 mb-2">
          <NavbarFeat />
        </div>
        <div className="min-h-0 overflow-y-auto">
          <Suspense fallback={null}>
            <PasswordChangeAlertWrapper />
          </Suspense>
          <div className="px-6 pb-4">{children}</div>
        </div>
      </div>
    </SupportTicketsRealtimeProvider>
  );
}
