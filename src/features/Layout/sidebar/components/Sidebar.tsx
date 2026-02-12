'use client';

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveLink } from '../hooks/useActiveLink';
import { useSidebarLinks } from '../hooks/useSidebarLinks';
import { SidebarProps } from '../types/types';

export function Sidebar({ initialPathname, accessibleModules }: SidebarProps) {
  const clientPathname = usePathname();
  const currentPathname = clientPathname || initialPathname;

  const filteredLinks = useSidebarLinks(accessibleModules);
  const activeLink = useActiveLink(filteredLinks, currentPathname);

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-2">
        <img
          src="/gh_logo.png"
          alt="codeControl logo"
          className="block group-data-[collapsible=icon]:size-5 group-data-[collapsible=icon]:object-contain"
        />
      </SidebarHeader>

      <SidebarContent>
        {filteredLinks.length > 0 ? (
          <SidebarMenu className="mt-4 gap-0">
            {filteredLinks.map((link) => {
              const isActive = link.name === activeLink;
              return (
                <SidebarMenuItem key={link.name} className={cn('relative', isActive && 'sidebar-link-active')}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={link.name}
                    className={cn(
                      'rounded-l-full rounded-r-none ml-3 px-4 py-3 h-auto text-[1.05rem] group-data-[collapsible=icon]:!ml-0 group-data-[collapsible=icon]:!rounded-md group-data-[collapsible=icon]:!px-2 group-data-[collapsible=icon]:!py-2 group-data-[collapsible=icon]:!h-8',
                      isActive &&
                        'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Link href={link.href}>
                      <link.icon className="size-[1.85rem] shrink-0 group-data-[collapsible=icon]:!size-4" />
                      <span>{link.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        ) : (
          <div className="mt-7 px-4 py-6 text-center">
            <div className="text-muted-foreground text-sm space-y-2">
              <p className="font-medium">Sin acceso</p>
              <p className="text-xs">No tienes permisos para acceder a ningún módulo. Contacta al administrador.</p>
            </div>
          </div>
        )}
      </SidebarContent>
    </ShadcnSidebar>
  );
}
