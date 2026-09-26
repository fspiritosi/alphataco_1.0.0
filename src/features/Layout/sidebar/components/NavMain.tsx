'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useUnreadSupportTicketsCount } from '@/features/Ayuda/hooks/useUnreadSupportTicketsCount';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { SUB_ITEM_ICONS, navigationLinks } from '../constants/navigation';
import { buildSidebarItems, createLinkRegex, findBestMatch, resolveActiveTab } from '../utils/sidebar.utils';

/**
 * Estilos del item de módulo.
 *
 * Las clases van escritas completas y no compuestas en runtime: Tailwind v4 escanea el código
 * como texto plano y una clase armada por concatenación nunca se genera.
 *
 * El módulo activo se marca con la barra de marca a la izquierda (`before:`) más texto e icono
 * en color; el relleno sólido se reserva para la hoja —la tab— que es donde realmente está
 * parado el usuario. Con `--radius: 0` no hay esquinas que ablanden nada, así que el peso
 * visual lo lleva el color.
 */
const MODULE_BUTTON = cn(
  'relative transition-colors',
  // Barra de marca del item activo. Se reserva el espacio siempre para que el texto no salte.
  'before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:bg-brand before:opacity-0 before:transition-opacity',
  'hover:bg-brand/10 hover:text-brand',
  'data-[active=true]:before:opacity-100',
  'data-[active=true]:bg-brand/10 data-[active=true]:font-semibold data-[active=true]:text-brand',
  'data-[active=true]:hover:bg-brand/15 data-[active=true]:hover:text-brand',
  // El icono acompaña al estado del item.
  '[&>svg]:text-sidebar-foreground/60 [&>svg]:transition-colors',
  'hover:[&>svg]:text-brand data-[active=true]:[&>svg]:text-brand'
);

/** Igual que el módulo, pero la tab activa va con relleno sólido: es la hoja del árbol. */
const SUB_ITEM_BUTTON = cn(
  'transition-colors',
  'hover:bg-brand/10 hover:text-brand',
  'data-[active=true]:bg-brand data-[active=true]:font-medium data-[active=true]:text-brand-foreground',
  'data-[active=true]:hover:bg-brand data-[active=true]:hover:text-brand-foreground',
  '[&>svg]:text-sidebar-foreground/50 [&>svg]:transition-colors',
  'hover:[&>svg]:text-brand data-[active=true]:[&>svg]:text-brand-foreground'
);

interface NavMainProps {
  /** Modulos a los que el usuario tiene acceso (`getUserAccessibleModulesServer`). */
  accessibleModuleSlugs: string[];
  /** Por modulo, los `tabSlug` de primer nivel visibles (`resolveVisibleTabs`). */
  visibleTabs: Record<string, string[]>;
}

/**
 * Menu principal del sidebar: un item por modulo y, para los que tienen tabs, un desplegable
 * con sus tabs de primer nivel (`?tab=<slug>`).
 *
 * Al colapsar el sidebar a iconos el desplegable no se abre: `SidebarMenuButton` muestra el
 * `tooltip` en su lugar, que es el comportamiento del bloque sidebar-07.
 */
export function NavMain({ accessibleModuleSlugs, visibleTabs }: NavMainProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Badge del modulo Ayuda: tickets de soporte sin leer.
  const unreadTickets = useUnreadSupportTicketsCount();

  const items = useMemo(
    () => buildSidebarItems(navigationLinks, accessibleModuleSlugs, visibleTabs),
    [accessibleModuleSlugs, visibleTabs]
  );

  const activeName = useMemo(
    () => findBestMatch(items.map((item) => ({ ...item, regex: createLinkRegex(item.href) })), pathname),
    [items, pathname]
  );

  if (items.length === 0) {
    return (
      <SidebarGroup>
        <div className="text-sidebar-foreground/70 px-2 py-6 text-center text-sm group-data-[collapsible=icon]:hidden">
          <p className="font-medium">Sin acceso</p>
          <p className="mt-1 text-xs">No tenés permisos para acceder a ningún módulo. Contactá al administrador.</p>
        </div>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] font-semibold tracking-[0.12em] uppercase">
        Módulos
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const isActive = item.name === activeName;
          const badgeCount = item.moduleSlug === 'ayuda' ? unreadTickets : 0;
          const activeTab = isActive ? resolveActiveTab(item, tabParam) : null;

          // Sin sub-items visibles (modulo de una sola tab, sin tabs, o sin permisos sobre
          // ninguna): link directo, sin desplegable. Al ser la hoja, va con relleno sólido.
          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.name}
                  isActive={isActive}
                  className={cn(
                    MODULE_BUTTON,
                    'data-[active=true]:bg-brand data-[active=true]:text-brand-foreground',
                    'data-[active=true]:hover:bg-brand data-[active=true]:hover:text-brand-foreground',
                    'data-[active=true]:[&>svg]:text-brand-foreground'
                  )}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
                {badgeCount > 0 && (
                  <SidebarMenuBadge className="bg-destructive text-destructive-foreground pointer-events-none">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible key={item.name} asChild defaultOpen={isActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.name} isActive={isActive} className={MODULE_BUTTON}>
                    <item.icon />
                    <span>{item.name}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-sidebar-border/70">
                    {item.items.map((subItem) => {
                      const SubIcon = SUB_ITEM_ICONS[`${item.moduleSlug}:${subItem.tabSlug}`];

                      return (
                        <SidebarMenuSubItem key={subItem.tabSlug}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subItem.tabSlug === activeTab}
                            className={SUB_ITEM_BUTTON}
                          >
                            <Link href={`${item.href}?tab=${subItem.tabSlug}`}>
                              {SubIcon && <SubIcon />}
                              <span>{subItem.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
