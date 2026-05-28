'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { NavigationLink } from '../constants/navigation';

interface SidebarLinkProps {
  link: NavigationLink;
  isActive: boolean;
  isCollapsed: boolean;
  badgeCount?: number;
}

/**
 * Componente individual de link del sidebar
 *
 * Renderiza un link con estilos condicionales según si está activo o colapsado.
 * Opcionalmente muestra un badge numérico al final cuando se provee badgeCount > 0.
 */
export function SidebarLink({ link, isActive, isCollapsed, badgeCount }: SidebarLinkProps) {
  const shouldShowBadge = typeof badgeCount === 'number' && badgeCount > 0;

  return (
    <Link
      href={link.href}
      className={cn(
        'flex items-center p-4 cursor-pointer transition-all duration-500 rounded-s-full lisidebar relative',
        isActive
          ? 'bg-gh_contrast dark:bg-slate-900 activesidebar before:shadow-custom-white after:shadow-custom-white-inverted dark:before:bg-slate-950 dark:after:bg-slate-950'
          : 'hover:bg-gh_contrast/80 hover:activesidebar',
        isCollapsed ? 'ml-0' : 'ml-4'
      )}
    >
      <div className="flex items-center overflow-hidden">
        <span className="relative">{link.icon}</span>
        <span className="ml-6 text-black dark:text-white relative block">{link.name}</span>
      </div>
      {shouldShowBadge && !isCollapsed && (
        <Badge
          variant="destructive"
          className="ml-auto h-5 min-w-5 px-1.5 text-xs font-semibold"
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </Badge>
      )}
    </Link>
  );
}
