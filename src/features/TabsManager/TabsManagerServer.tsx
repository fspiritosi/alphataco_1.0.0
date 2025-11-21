import { TabsManagerClient } from './TabsManagerClient';
import type { TabsManagerServerProps } from './types';

/**
 * TabsManagerServer - Componente servidor para gestionar pestañas.
 *
 * Este componente se encarga de:
 * - Filtrar pestañas según roles del usuario (TODO: implementar lógica de roles)
 * - Determinar el valor por defecto basado en searchParams o defaultTab
 * - Renderizar el componente cliente con la configuración procesada
 */
export function TabsManagerServer({
  paramName,
  tabs,
  defaultTab,
  searchParams,
  dependentParams = [],
}: TabsManagerServerProps) {
  // TODO: Implementar validación de roles
  // Ejemplo de lógica futura:
  // const userRole = await getUserRole(); // Obtener rol del usuario desde cookies/sesión
  // const filteredTabs = tabs.filter((tab) => {
  //   if (!tab.roles || tab.roles.length === 0) return true;
  //   return tab.roles.includes(userRole);
  // });

  // Por ahora, usar todas las pestañas sin filtrar
  const filteredTabs = tabs;

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
