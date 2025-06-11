import { cookies } from 'next/headers';
import type React from 'react';
import { TabsControllerInternal } from './tabs-controller-internal';

export interface ViewDataObj {
  defaultValue: string;
  path: string;
  tabsValues: {
    value: string;
    name: React.ReactNode | string;
    restricted: string[];
    tab?: string;
    options?: { value: string; label: string }[];
    content: {
      title: string;
      description?: string;
      buttonActioRestricted: string[];
      buttonAction?: React.ReactNode;
      component: React.ReactNode;
    };
  }[];
}

export default function ViewComponentInternal({ viewData }: { viewData: ViewDataObj }) {
  const cookiesStore = cookies();
  const role = cookiesStore.get('guestRole')?.value;

  // Preparar los datos para el componente cliente
  // Filtrar las tabs restringidas en el servidor
  const clientTabsData = viewData.tabsValues.map((tab) => ({
    ...tab,
    restricted: tab.restricted.includes(role || ''),
    content: {
      ...tab.content,
      buttonActioRestricted: tab.content.buttonActioRestricted.includes(role || ''),
    },
  }));

  // Determinar el valor por defecto considerando las restricciones
  let effectiveDefaultValue = viewData.defaultValue;

  // Si el subtab por defecto está restringido, seleccionar el primer subtab no restringido
  if (clientTabsData.find((tab) => tab.value === effectiveDefaultValue)?.restricted) {
    const firstAllowedTab = clientTabsData.find((tab) => !tab.restricted);
    if (firstAllowedTab) {
      effectiveDefaultValue = firstAllowedTab.value;
    }
  }

  return (
    <TabsControllerInternal defaultValue={effectiveDefaultValue} tabsValues={clientTabsData} path={viewData.path} />
  );
}
