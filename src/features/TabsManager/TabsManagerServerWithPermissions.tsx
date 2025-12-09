import { getUserPermissionsMapServer } from '@/features/Permissions';
import type { ModuleSlug } from '@/features/Permissions/permissions-map';
import { TabsManagerServer } from './TabsManagerServer';
import type { TabsManagerServerProps } from './types';

/**
 * TabsManagerServerWithPermissions - Wrapper que obtiene permisos y los pasa a TabsManagerServer
 *
 * Este componente obtiene permisos UNA VEZ y los pasa explícitamente como prop a TabsManagerServer.
 *
 * OPTIMIZACIÓN: Si los permisos ya están en cache (obtenidos en el layout), esta llamada
 * usará el cache y no hará una query adicional.
 *
 * @example
 * ```tsx
 * // En lugar de:
 * <TabsManagerServer tabs={tabs} ... />
 *
 * // Usa:
 * <TabsManagerServerWithPermissions tabs={tabs} ... />
 * ```
 */
export async function TabsManagerServerWithPermissions<M extends ModuleSlug = ModuleSlug>(
  props: Omit<TabsManagerServerProps<M>, 'permissions'>
) {
  // Obtener permisos (usará cache si ya fueron obtenidos en el layout)
  const permissions = await getUserPermissionsMapServer();

  // Pasar permisos explícitamente como prop a TabsManagerServer
  return <TabsManagerServer {...props} permissions={permissions} />;
}
