import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { SidebarShell } from './components/SidebarShell';
import { SidebarLinksAsync } from './components/async/SidebarLinksAsync';

/**
 * SidebarFeat — Shell estático (logo + contenedor) + links dinámicos en Suspense.
 *
 * El logo y la estructura del sidebar se renderizan INSTANTÁNEAMENTE.
 * Los links de navegación (que dependen de permisos) se cargan por streaming.
 */
function SidebarFeat() {
  return (
    <SidebarShell>
      <Suspense
        fallback={
          <div className="mt-[27px] space-y-2 px-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        }
      >
        <SidebarLinksAsync />
      </Suspense>
    </SidebarShell>
  );
}

export default SidebarFeat;
