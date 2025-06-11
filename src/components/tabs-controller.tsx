'use client';

import type React from 'react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FormTableResizableSkeleton } from './Skeletons/ResizablePanelSkeleton';

interface TabsControllerProps {
  defaultValue: string;
  tabsValues: {
    value: string;
    name: React.ReactNode | string;
    restricted: boolean;
    content: {
      component: React.ReactNode;
    };
  }[];
  path: string;
}

export function TabsController({ defaultValue, tabsValues, path }: TabsControllerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || defaultValue);

  // Actualizar el estado cuando cambia la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabsValues.some((tab) => tab.value === tabFromUrl && !tab.restricted)) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && defaultValue) {
      setActiveTab(tabFromUrl || defaultValue);
    }
  }, [searchParams, defaultValue, tabsValues]);

  // Manejar el cambio de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Actualizar la URL sin recargar la página
    const params = new URLSearchParams(searchParams.toString());

    if (value === defaultValue) {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }

    // IMPORTANTE: Resetear subtabs cuando cambia el tab principal
    params.delete('subtab');
    params.delete('nestedtab'); // Por si implementas el tercer nivel

    const queryString = params.toString();
    const url = queryString ? `${path}?${queryString}` : path;

    router.replace(url, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="flex gap-1 justify-start w-fit bg-gh dark:bg-slate-950">
        {tabsValues.map(
          (tab) =>
            !tab.restricted && (
              <TabsTrigger key={tab.value} value={tab.value} id={tab.value} className="text-gh_orange font-semibold">
                <div>{tab.name}</div>
              </TabsTrigger>
            )
        )}
      </TabsList>

      {tabsValues.map(
        (tab) =>
          !tab.restricted && (
            <TabsContent key={tab.value} value={tab.value}>
              <Card className="overflow-visible">
                <Suspense fallback={<FormTableResizableSkeleton formRows={6} tableRows={10} />}>
                  <CardContent className="py-4 px-4 relative">{tab.content.component}</CardContent>
                </Suspense>
                <CardFooter className="flex flex-row items-center border-t bg-gh/70 dark:bg-muted/50 px-6 py-3"></CardFooter>
              </Card>
            </TabsContent>
          )
      )}
    </Tabs>
  );
}
