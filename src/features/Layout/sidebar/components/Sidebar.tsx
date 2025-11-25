'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useActiveLink } from '../hooks/useActiveLink';
import { useSidebarLinks } from '../hooks/useSidebarLinks';
import { useSidebarStore } from '../store/useSidebarStore';
import { SidebarProps } from '../types/types';
import { SidebarLink } from './SidebarLink';

/**
 * Componente principal del Sidebar
 *
 * Renderiza el sidebar con los links filtrados según permisos del usuario
 * Usa hooks personalizados para separar la lógica de negocio
 *
 * Estrategia de pathname:
 * - initialPathname: Viene del servidor (SSR) para la primera carga
 * - usePathname(): Se sincroniza automáticamente en navegaciones client-side
 * - Fallback: Si usePathname() falla, usa initialPathname
 */
export function Sidebar({ initialPathname, accessibleModules }: SidebarProps) {
  const isActiveSidebar = useSidebarStore((state) => state.isActiveSidebar);

  // Obtener pathname actual del cliente (se actualiza automáticamente)
  const clientPathname = usePathname();

  // Usar pathname del cliente si está disponible, sino usar el inicial del servidor
  const currentPathname = clientPathname || initialPathname;

  // Hooks personalizados para lógica de negocio
  const filteredLinks = useSidebarLinks(accessibleModules);
  const activeLink = useActiveLink(filteredLinks, currentPathname);

  return (
    <div
      className={cn(
        'sticky top-0 left-0 h-screen bg-gh dark:bg-slate-950 dark:text-white transition-width duration-500',
        isActiveSidebar ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center p-2 justify-center')}>
        <span className="text-white text-xl flex items-center gap-2 relative overflow-hidden">
          <img src="/gh_logo.png" alt="codeControl logo" className="relative block" />
        </span>
      </div>

      {/* Links o Fallback */}
      {filteredLinks.length > 0 ? (
        <ul className="mt-[27px]">
          {filteredLinks.map((link) => (
            <SidebarLink
              key={link.name}
              link={link}
              isActive={link.name === activeLink}
              isCollapsed={isActiveSidebar}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-[27px] px-4 py-6 text-center">
          <div className="text-muted-foreground text-sm space-y-2">
            <p className="font-medium">Sin acceso</p>
            <p className="text-xs">No tienes permisos para acceder a ningún módulo. Contacta al administrador.</p>
          </div>
        </div>
      )}
    </div>
  );
}
