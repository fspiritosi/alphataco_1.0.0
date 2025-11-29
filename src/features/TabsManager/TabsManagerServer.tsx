import { checkMultiplePermissionsServer } from '@/features/Permissions';
import type { ModuleSlug } from '@/features/Permissions/permissions-map';
import { TabsManagerClient } from './TabsManagerClient';
import type { TabsManagerServerProps } from './types';

/**
 * TabsManagerServer - Componente servidor para gestionar pestañas con tipado fuerte.
 *
 * Este componente se encarga de:
 * - Filtrar pestañas según permisos del usuario en la base de datos
 * - Verificar permisos usando checkMultiplePermissionsServer() en UNA SOLA llamada (optimizado)
 * - Determinar el valor por defecto basado en searchParams o defaultTab
 * - Renderizar el componente cliente con la configuración procesada
 *
 * OPTIMIZACIÓN: Usa checkMultiplePermissionsServer para verificar todos los tabs
 * en una sola llamada a la base de datos, reduciendo latencia de ~1000ms a ~80ms.
 *
 * Para habilitar autocompletado de `defaultTab`, usa `as const` en el array de tabs.
 *
 * @example
 * ```tsx
 * const tabs = [
 *   { value: 'principal', label: 'Principal', moduleSlug: 'dashboard', tabSlug: 'principal', content: <Content /> },
 *   { value: 'documentacion', label: 'Documentación', moduleSlug: 'dashboard', tabSlug: 'documentacion', content: <Content /> },
 * ] as const;
 *
 * <TabsManagerServer
 *   paramName="tab"
 *   searchParams={searchParams}
 *   tabs={tabs}
 *   defaultTab="principal"  // ← Autocompletado: 'principal' | 'documentacion'
 * />
 * ```
 */
export async function TabsManagerServer<M extends ModuleSlug = ModuleSlug>({
  paramName,
  tabs,
  defaultTab,
  searchParams,
  dependentParams = [],
}: TabsManagerServerProps<M>) {
  // 1. Preparar todas las verificaciones de permisos
  const permissionsToCheck = tabs
    .filter((tab) => tab.moduleSlug && tab.tabSlug)
    .map((tab) => ({
      moduleSlug: String(tab.moduleSlug),
      tabSlug: String(tab.tabSlug),
      actionSlug: 'view',
    }));

  // 2. UNA SOLA LLAMADA para verificar TODOS los permisos (OPTIMIZADO)
  const permissionsMap = await checkMultiplePermissionsServer(permissionsToCheck);

  // 3. Filtrar tabs basándose en los resultados
  const filteredTabs = tabs.filter((tab) => {
    // Si no tiene moduleSlug/tabSlug, mostrar siempre (sin restricción)
    if (!tab.moduleSlug || !tab.tabSlug) {
      return true;
    }

    // Verificar permiso desde el Map (O(1) - instantáneo)
    const key = `${String(tab.moduleSlug)}:${String(tab.tabSlug)}:view`;
    return permissionsMap.get(key) === true;
  });

  // Si no hay tabs visibles, mostrar mensaje
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

  // Determinar el tab activo desde los searchParams
  const paramValue = searchParams[paramName];
  const activeTab = typeof paramValue === 'string' ? paramValue : defaultTab;

  // Verificar que el tab activo existe en la lista filtrada
  const tabExists = filteredTabs.some((tab) => tab?.value === activeTab);
  const effectiveDefaultTab = tabExists ? activeTab : filteredTabs[0]?.value || defaultTab;

  return (
    <TabsManagerClient
      paramName={paramName}
      tabs={filteredTabs}
      defaultTab={effectiveDefaultTab}
      dependentParams={dependentParams}
    />
  );
}
