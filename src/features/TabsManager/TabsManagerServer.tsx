import { createTabVisibilityChecker } from '@/features/Permissions/lib/tab-visibility';
import type { ModuleSlug } from '@/features/Permissions/permissions-map';
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
  variant,
  actions,
}: TabsManagerServerProps<M>) {
  // En Next.js 16, searchParams es una Promise, necesitamos hacer await
  const resolvedSearchParams = await searchParams;

  // La regla de "¿esta tab se ve?" (view explícito o inferido desde una subtab) es compartida:
  // la misma que usan el sidebar para ofrecer la sección y `SectionManagerServer` para montarla.
  // Antes vivía acá duplicada, con helpers tipados `any`.
  const isTabVisible = createTabVisibilityChecker(providedPermissions ?? {});

  const filteredTabs = tabs.filter((tab) => {
    // Sin moduleSlug/tabSlug no hay permiso que verificar: se muestra siempre.
    if (!tab.moduleSlug || !tab.tabSlug) return true;
    return isTabVisible(String(tab.moduleSlug), String(tab.tabSlug));
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
  const paramValue = resolvedSearchParams[paramName];
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
      variant={variant}
      actions={actions}
    />
  );
}
