import { supabaseServer } from '@/lib/supabase/server';
import { getActualRole } from '@/lib/utils';
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
  searchParams?: { tab?: string };
}) {
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;
  const role = await getActualRole(actualCompany as string, user?.data?.user?.id as string);

  // Preparar los datos para el componente cliente
  // Filtrar las tabs restringidas en el servidor
  const clientTabsData = viewData.tabsValues.map((tab) => ({
    ...tab,
    restricted: tab.restricted.includes(role),
  }));

  // Determinar el valor por defecto considerando las restricciones
  let effectiveDefaultValue = viewData.defaultValue;

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
