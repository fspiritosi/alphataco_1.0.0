'use client';

import type React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FormTableResizableSkeleton } from './Skeletons/ResizablePanelSkeleton';

interface TabsControllerInternalProps {
  defaultValue: string;
  tabsValues: {
    value: string;
    name: React.ReactNode | string;
    restricted: boolean;
    content: {
      buttonAction?: React.ReactNode;
      buttonActioRestricted: boolean;
      component: React.ReactNode;
    };
  }[];
  path: string;
}

export function TabsControllerInternal({ defaultValue, tabsValues, path }: TabsControllerInternalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState<string>(searchParams.get('subtab') || defaultValue);

  // Actualizar el estado cuando cambia la URL
  useEffect(() => {
    const subtabFromUrl = searchParams.get('subtab');

    // Si hay un subtab en la URL y existe en las tabs actuales, usarlo
    if (subtabFromUrl && tabsValues.some((tab) => tab.value === subtabFromUrl && !tab.restricted)) {
      setActiveSubTab(subtabFromUrl);
    } else {
      // Si no hay subtab en la URL o no existe en las tabs actuales, usar el default
      setActiveSubTab(defaultValue);
    }
  }, [searchParams, defaultValue, tabsValues]);

  // IMPORTANTE: Resetear cuando cambia el tab principal
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    const currentSubtab = searchParams.get('subtab');

    // Si no hay subtab en la URL (fue eliminado por el cambio de tab principal)
    // resetear al valor por defecto
    if (!currentSubtab) {
      setActiveSubTab(defaultValue);
    }
  }, [searchParams.get('tab'), defaultValue]);

  // Manejar el cambio de subtab
  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value);

    // Actualizar la URL manteniendo el parámetro tab principal
    const params = new URLSearchParams(searchParams.toString());

    if (value === defaultValue) {
      params.delete('subtab');
    } else {
      params.set('subtab', value);
    }

    const queryString = params.toString();
    const url = queryString ? `${path}?${queryString}` : path;

    router.replace(url, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6 py-1 h-full">
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="flex gap-1 justify-start w-fit bg-gh_contrast/50 dark:bg-slate-900">
          {tabsValues.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} id={tab.value} className="text-gh_orange font-semibold">
              <div>{tab.name}</div>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsValues.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Suspense fallback={<FormTableResizableSkeleton formRows={6} tableRows={10} />}>
              {tab.content.buttonAction && !tab.content.buttonActioRestricted && (
                <div className="flex gap-4 py-2 flex-wrap justify-start">{tab.content.buttonAction}</div>
              )}
            </Suspense>
            <Suspense fallback={<FormTableResizableSkeleton formRows={6} tableRows={10} />}>
              <div className="py-2">{tab.content.component}</div>
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
