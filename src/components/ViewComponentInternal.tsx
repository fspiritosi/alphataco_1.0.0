import { getSubTabCookie } from '@/shared/actions/actions';
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

export default async function ViewComponentInternal({
  viewData,
  currentMainTab,
}: {
  viewData: ViewDataObj;
  currentMainTab?: string;
}) {
  const cookiesStore = await cookies();
  const role = cookiesStore.get('guestRole')?.value;

  // ✅ OBTENER SOLO LA SUB-PESTAÑA PARA LA PESTAÑA PRINCIPAL ACTUAL
  const savedSubTab = currentMainTab ? await getSubTabCookie(viewData.path, currentMainTab) : null;

  // Preparar los datos para el componente cliente
  const clientTabsData = viewData.tabsValues.map((tab) => ({
    ...tab,
    restricted: tab.restricted.includes(role || ''),
    content: {
      ...tab.content,
      buttonActioRestricted: tab.content.buttonActioRestricted.includes(role || ''),
    },
  }));

  // Determinar el valor por defecto
  let effectiveDefaultValue = viewData.defaultValue;

  // Si hay una sub-pestaña guardada para esta pestaña principal, usarla
  if (savedSubTab) {
    effectiveDefaultValue = savedSubTab;
  }

  // Si el subtab por defecto está restringido, seleccionar el primer subtab no restringido
  if (clientTabsData.find((tab) => tab.value === effectiveDefaultValue)?.restricted) {
    const firstAllowedTab = clientTabsData.find((tab) => !tab.restricted);
    if (firstAllowedTab) {
      effectiveDefaultValue = firstAllowedTab.value;
    }
  }

  return (
    <TabsControllerInternal
      defaultValue={effectiveDefaultValue}
      tabsValues={clientTabsData}
      path={viewData.path}
      currentMainTab={currentMainTab || viewData.defaultValue}
    />
  );
}
