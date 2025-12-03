'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import type { ModuleSlug } from '@/features/Permissions/permissions-map';
import { cn } from '@/lib/utils';
import { TabsManagerClient } from './TabsManagerClient';
import type { TabsManagerClientProps } from './types';

/**
 * TabsManagerClientSide - Componente cliente wrapper que gestiona permisos en el cliente.
 *
 * Este componente es útil cuando necesitas usar TabsManager dentro de un componente cliente
 * y no puedes pasar los tabs filtrados desde el servidor.
 *
 * Funcionalidad:
 * 1. Recibe la lista completa de tabs.
 * 2. Usa el hook `usePermissions` para obtener los permisos del usuario.
 * 3. Filtra los tabs según los permisos (moduleSlug + tabSlug).
 * 4. Renderiza `TabsManagerClient` con los tabs filtrados.
 */
export function TabsManagerClientSide<M extends ModuleSlug = ModuleSlug>(props: TabsManagerClientProps<M>) {
  const { canView, isLoading } = usePermissions();

  // Filtrar tabs según permisos del usuario
  // canView usa lógica de visibilidad inferida: si no tiene permiso explícito de 'view',
  // verifica si tiene acceso a alguna subtab
  const filteredTabs = props.tabs.filter((tab) => {
    // Si no tiene moduleSlug o tabSlug, mostrar el tab (no está protegido)
    if (!tab.moduleSlug || !tab.tabSlug) return true;

    // Usar canView que implementa visibilidad inferida
    return canView(String(tab.moduleSlug), String(tab.tabSlug));
  });

  // Si estamos cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-1 h-full w-full">
        {/* Skeleton para TabsList */}
        <div className="flex gap-1 justify-start w-fit">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Skeleton para TabsContent */}
        <div className="py-2 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  // Si después de filtrar no queda ningún tab, mostrar mensaje de acceso denegado
  if (filteredTabs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground font-medium">Sin acceso</p>
          <p className="text-sm text-muted-foreground">No tienes permisos para ver ninguna pestaña en esta sección.</p>
        </div>
      </div>
    );
  }

  // Verificar que el tab activo (defaultTab o URL) existe en la lista filtrada
  const firstValidTab = filteredTabs[0]?.value;

  // Si el defaultTab original no está en los filtrados, usar el primero válido
  const effectiveDefaultTab = filteredTabs.some((t) => t.value === props.defaultTab) ? props.defaultTab : firstValidTab;

  // Mapa de clases para columnas de grid según cantidad de tabs
  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  };

  // Calcular clase dinámica para el grid
  const dynamicGridClass = gridCols[filteredTabs.length] || 'grid-cols-5';

  // Combinar con la clase recibida por props
  const dynamicListClassName = cn(props.listClassName, dynamicGridClass);

  return (
    <TabsManagerClient
      {...props}
      tabs={filteredTabs}
      defaultTab={effectiveDefaultTab}
      listClassName={dynamicListClassName}
    />
  );
}
