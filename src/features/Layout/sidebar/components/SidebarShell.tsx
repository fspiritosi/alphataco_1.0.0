'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useSidebarStore } from '../store/useSidebarStore';

/**
 * SidebarShell — contenedor estático del sidebar con logo.
 * Se renderiza INSTANTÁNEAMENTE sin esperar datos del servidor.
 * Los children (links dinámicos) se pasan desde el Server Component padre.
 */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const isActiveSidebar = useSidebarStore((state) => state.isActiveSidebar);

  return (
    <div
      className={cn(
        'sticky top-0 left-0 h-screen bg-gh dark:bg-slate-950 dark:text-white transition-width duration-500',
        isActiveSidebar ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo — siempre visible, instantáneo */}
      <div className={cn('flex items-center p-2 justify-center')}>
        <span className="text-white text-xl flex items-center gap-2 relative overflow-hidden">
          <Image src="/gh_logo.png" alt="codeControl logo" width={160} height={40} priority />
        </span>
      </div>

      {/* Links dinámicos (vienen como children del Suspense) */}
      {children}
    </div>
  );
}
