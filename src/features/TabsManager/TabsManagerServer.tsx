import { checkPermissionServer } from '@/features/Permissions';
import type { ModuleSlug } from '@/features/Permissions/permissions-map';
import { TabsManagerClient } from './TabsManagerClient';
import type { TabsManagerServerProps } from './types';

/**
 * TabsManagerServer - Componente servidor para gestionar pestañas con tipado fuerte.
 *
 * Este componente se encarga de:
 * - Filtrar pestañas según permisos del usuario en la base de datos
 * - Verificar permisos usando checkPermissionServer() para cada tab
 * - Determinar el valor por defecto basado en searchParams o defaultTab
 * - Renderizar el componente cliente con la configuración procesada
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
  // Filtrar tabs según permisos del usuario
  const filteredTabsPromises = tabs.map(async (tab) => {
    // Si no tiene moduleSlug/tabSlug, mostrar siempre (sin restricción)
    if (!tab.moduleSlug || !tab.tabSlug) {
      return tab;
    }

    // Verificar permiso de 'view' para este tab
    try {
      const canView = await checkPermissionServer(String(tab.moduleSlug), String(tab.tabSlug), 'view');
      return canView ? tab : null;
    } catch (error) {
      console.error(`Error checking permission for ${String(tab.moduleSlug)}:${String(tab.tabSlug)}`, error);
      return null; // En caso de error, ocultar el tab por seguridad
    }
  });

  const filteredTabsResults = await Promise.all(filteredTabsPromises);
  const filteredTabs = filteredTabsResults.filter((tab) => tab !== null);

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
  const tabExists = filteredTabs.some((tab) => tab.value === activeTab);
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
