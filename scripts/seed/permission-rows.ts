/**
 * Transformacion pura del mapa de permisos (src/features/Permissions/permissions-map.ts)
 * a las filas que necesita el seed de empresa para `modules`, `tabs`, `actions` y
 * `role_permissions`. Sin efectos de lado (sin BD, sin fs): input -> output.
 *
 * Los 3 roles de acceso total del sistema (ver CLAUDE.md, seccion "Permisos: 3 roles
 * de acceso completo") reciben TODAS las combinaciones tab x accion permitida.
 */

export const SYSTEM_ROLE_SLUGS = ['admin', 'administrador', 'full-access-provisional'] as const;

/** Estructura recursiva de una tab/subtab del mapa de permisos (hasta N niveles). */
export type TabDef = {
  slug: string;
  name: string;
  tabId: string;
  parent: string | null;
  allowedActions: readonly string[];
  subtabs?: Record<string, TabDef>;
};

export type ModuleDef = {
  slug: string;
  name: string;
  moduleId: string;
  tabs: Record<string, TabDef>;
};

/** Forma generica del mapa de permisos — estructuralmente compatible con PERMISSIONS. */
export type PermissionsMap = Record<string, ModuleDef>;

export type ModuleRow = { id: string; slug: string; name: string };

export type TabRow = {
  id: string;
  moduleId: string;
  parentTabId: string | null;
  slug: string;
  name: string;
  orderIndex: number;
};

export type ActionRow = { slug: string; name: string };

export type RolePermissionRow = {
  roleSlug: (typeof SYSTEM_ROLE_SLUGS)[number];
  tabId: string;
  actionSlug: string;
};

export type PermissionRows = {
  modules: ModuleRow[];
  tabs: TabRow[];
  actions: ActionRow[];
  rolePermissions: RolePermissionRow[];
};

/**
 * Construye las filas de permisos a partir del mapa.
 *
 * @param map mapa de modulos/tabs/subtabs (PERMISSIONS de permissions-map.ts, o uno minimo para tests)
 * @param actionNames nombres legibles por slug de accion (ej. ACTIONS de permissions-map.ts
 *   mapeado a { view: 'Ver', ... }); si una accion no tiene nombre, se usa el slug tal cual
 */
export function buildPermissionRows(
  map: PermissionsMap,
  actionNames: Record<string, string> = {}
): PermissionRows {
  const modules: ModuleRow[] = [];
  const tabs: TabRow[] = [];
  const actionsBySlug = new Map<string, ActionRow>();
  const rolePermissions: RolePermissionRow[] = [];

  function walkTabs(tabDefs: Record<string, TabDef>, moduleId: string, parentTabId: string | null): void {
    let orderIndex = 0;
    for (const tabDef of Object.values(tabDefs)) {
      tabs.push({
        id: tabDef.tabId,
        moduleId,
        parentTabId,
        slug: tabDef.slug,
        name: tabDef.name,
        orderIndex,
      });
      orderIndex += 1;

      for (const actionSlug of tabDef.allowedActions) {
        if (!actionsBySlug.has(actionSlug)) {
          actionsBySlug.set(actionSlug, {
            slug: actionSlug,
            name: actionNames[actionSlug] ?? actionSlug,
          });
        }
        for (const roleSlug of SYSTEM_ROLE_SLUGS) {
          rolePermissions.push({ roleSlug, tabId: tabDef.tabId, actionSlug });
        }
      }

      if (tabDef.subtabs) {
        walkTabs(tabDef.subtabs, moduleId, tabDef.tabId);
      }
    }
  }

  for (const moduleDef of Object.values(map)) {
    modules.push({ id: moduleDef.moduleId, slug: moduleDef.slug, name: moduleDef.name });
    walkTabs(moduleDef.tabs, moduleDef.moduleId, null);
  }

  return { modules, tabs, actions: Array.from(actionsBySlug.values()), rolePermissions };
}
