'use client';

import { usePathname } from 'next/navigation';
import { useActiveLink } from '../hooks/useActiveLink';
import { useSidebarLinks } from '../hooks/useSidebarLinks';
import { useSidebarStore } from '../store/useSidebarStore';
import { SidebarProps } from '../types/types';
import { SidebarLink } from './SidebarLink';

/**
 * SidebarLinks — renderiza los links de navegación filtrados por permisos.
 * Recibe `accessibleModules` del Server Component padre (ya cargado).
 */
export function SidebarLinks({ accessibleModules }: SidebarProps) {
  const isActiveSidebar = useSidebarStore((state) => state.isActiveSidebar);
  const currentPathname = usePathname();

  const filteredLinks = useSidebarLinks(accessibleModules);
  const activeLink = useActiveLink(filteredLinks, currentPathname);

  if (filteredLinks.length === 0) {
    return (
      <div className="mt-[27px] px-4 py-6 text-center">
        <div className="text-muted-foreground text-sm space-y-2">
          <p className="font-medium">Sin acceso</p>
          <p className="text-xs">No tienes permisos para acceder a ningún módulo. Contacta al administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-[27px]">
      {filteredLinks.map((link) => (
        <SidebarLink
          key={link.name}
          link={link}
          isActive={link.name === activeLink}
          isCollapsed={isActiveSidebar}
          badgeCount={link.badgeCount}
        />
      ))}
    </ul>
  );
}
