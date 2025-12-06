import { getMainTabCookie } from '@/shared/actions/actions';
import { cookies } from 'next/headers';
import type React from 'react';
import { TabsController } from './tabs-controller';

interface ViewDataObj {
  defaultValue: string;
  path: string;
  tabsValues: {
    value: string;
    name: React.ReactNode | string;
    restricted: string[];
    content: {
      title: string;
      description?: string;
      buttonActioRestricted: string[];
      buttonAction?: React.ReactNode;
      component: React.ReactNode;
    };
  }[];
}

export default async function ViewComponent({
  viewData,
  searchParams,
}: {
  viewData: ViewDataObj;
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}) {
  const cookiesStore = await cookies();
  const role = cookiesStore.get('guestRole')?.value;

  // ✅ OBTENER SOLO LA PESTAÑA PRINCIPAL
  const savedMainTab = await getMainTabCookie(viewData.path);

  // Preparar los datos para el componente cliente
  const clientTabsData = viewData.tabsValues.map((tab) => ({
    ...tab,
    restricted: tab.restricted.includes(role || ''),
  }));

  // Determinar el valor por defecto
  let effectiveDefaultValue = viewData.defaultValue;

  // En Next.js 16, searchParams puede ser una Promise
  const resolvedSearchParams = searchParams
    ? searchParams instanceof Promise
      ? await searchParams
      : searchParams
    : undefined;

  // Prioridad: searchParams > cookie > defaultValue
  if (resolvedSearchParams?.tab) {
    effectiveDefaultValue = resolvedSearchParams.tab;
  } else if (savedMainTab) {
    effectiveDefaultValue = savedMainTab;
  }

  // Si el tab por defecto está restringido, seleccionar el primer tab no restringido
  if (clientTabsData.find((tab) => tab.value === effectiveDefaultValue)?.restricted) {
    const firstAllowedTab = clientTabsData.find((tab) => !tab.restricted);
    if (firstAllowedTab) {
      effectiveDefaultValue = firstAllowedTab.value;
    }
  }

  return (
    <div className="flex flex-col gap-6 py-1 px-6 h-full">
      <TabsController defaultValue={effectiveDefaultValue} tabsValues={clientTabsData} path={viewData.path} />
    </div>
  );
}
