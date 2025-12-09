import { PERMISSIONS, type ModuleSlug } from '@/features/Permissions/permissions-map';
import { TabsManagerClient } from './TabsManagerClient';
import type { TabsManagerServerProps } from './types';

/**
 * TabsManagerServer - Componente servidor para gestionar pestañas con tipado fuerte.
 *
 * Este componente se encarga de:
 * - Filtrar pestañas según permisos del usuario proporcionados como prop
 * - Verificar permisos usando el objeto proporcionado directamente (sin caché)
 * - Determinar el valor por defecto basado en searchParams o defaultTab
 * - Renderizar el componente cliente con la configuración procesada
 *
 * IMPORTANTE: Los permisos deben obtenerse en cada página y pasarse como prop obligatoria.
 * No hay fallback: si no hay permisos, no hay acceso.
 *
 * VISIBILIDAD INFERIDA: Si el usuario no tiene permiso explícito de 'view' en una tab,
 * pero tiene acceso a alguna de sus subtabs, la tab será visible automáticamente.
 *
 * Para habilitar autocompletado de `defaultTab`, usa `as const` en el array de tabs.
 *
 * @example
 * ```tsx
 * // En cada página
 * const permissions = await getUserPermissionsMapServer();
 *
 * const tabs = [
 *   { value: 'principal', label: 'Principal', moduleSlug: 'dashboard', tabSlug: 'principal', content: <Content /> },
 *   { value: 'documentacion', label: 'Documentación', moduleSlug: 'dashboard', tabSlug: 'documentacion', content: <Content /> },
 * ] as const;
 *
 * <TabsManagerServer
 *   paramName="tab"
 *   searchParams={searchParams}
 *   tabs={tabs}
 *   defaultTab="principal"
 *   permissions={permissions}  // ← OBLIGATORIO
 * />
 * ```
 */
export async function TabsManagerServer<M extends ModuleSlug = ModuleSlug>({
  paramName,
  tabs,
  defaultTab,
  searchParams,
  dependentParams = [],
  permissions: providedPermissions,
}: TabsManagerServerProps<M>) {
  // Convertir el objeto plano de permisos a Map para acceso O(1)
  // Los permisos son obligatorios, no hay fallback
  const permissionMap = new Map<string, boolean>();
  if (providedPermissions && typeof providedPermissions === 'object' && !Array.isArray(providedPermissions)) {
    const entries = Object.entries(providedPermissions);
    entries.forEach(([key, value]) => {
      permissionMap.set(key, value);
    });
  }

  // Helper para verificar visibilidad inferida (si tiene acceso a alguna subtab)
  const checkInferredVisibility = (moduleSlug: string, tabSlug: string): boolean => {
    const moduleDef = PERMISSIONS[moduleSlug as ModuleSlug];
    if (!moduleDef) return false;

    // Helper para encontrar la definición del tab
    const findTabDef = (tabs: any): any => {
      if (tabs[tabSlug]) return tabs[tabSlug];
      for (const key in tabs) {
        if (tabs[key].subtabs) {
          const found = findTabDef(tabs[key].subtabs);
          if (found) return found;
        }
      }
      return null;
    };

    const tabDef = findTabDef(moduleDef.tabs);
    if (!tabDef || !tabDef.subtabs) return false;

    // Helper para verificar si alguna subtab tiene permiso de 'view'
    const hasAnySubtabPermission = (subtabs: any): boolean => {
      for (const key in subtabs) {
        const subtab = subtabs[key];
        // Verificar si esta subtab tiene permiso de 'view'
        const permissionKey = `${moduleSlug}:${subtab.slug}:view`;
        if (permissionMap.get(permissionKey)) return true;

        // Recursivamente verificar sus subtabs
        if (subtab.subtabs && hasAnySubtabPermission(subtab.subtabs)) return true;
      }
      return false;
    };

    return hasAnySubtabPermission(tabDef.subtabs);
  };

  // Filtrar tabs basándose en permisos usando el Map cacheado
  const filteredTabs = tabs.filter((tab) => {
    // Si no tiene moduleSlug/tabSlug, mostrar siempre (sin restricción)
    if (!tab.moduleSlug || !tab.tabSlug) {
      return true;
    }

    const moduleSlug = String(tab.moduleSlug);
    const tabSlug = String(tab.tabSlug);

    // 1. Verificar permiso explícito de 'view' usando el Map (acceso O(1))
    const key = `${moduleSlug}:${tabSlug}:view`;
    if (permissionMap.get(key)) return true;

    // 2. Verificar visibilidad inferida (si tiene acceso a alguna subtab)
    // Esto permite que tabs padre sean visibles si el usuario tiene acceso a alguna de sus subtabs
    return checkInferredVisibility(moduleSlug, tabSlug);
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
