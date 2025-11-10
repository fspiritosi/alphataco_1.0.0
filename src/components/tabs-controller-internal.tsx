'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { setSubTabCookie } from '@/shared/actions/actions';
import Cookies from 'js-cookie';
import type React from 'react';
import { Suspense, useEffect, useState } from 'react';

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
  currentMainTab?: string;
}
export async function setSubTabCookieClientSide(path: string, mainTab: string, subTab: string) {
  const cookieKey = `sub_tab_${path.replace(/\//g, '_')}_${mainTab.replace(/\s+/g, '_')}`;
  Cookies.set(cookieKey, subTab);
}

export function TabsControllerInternal({
  defaultValue,
  tabsValues,
  path,
  currentMainTab,
}: TabsControllerInternalProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>(defaultValue);

  // Inicializar con el valor por defecto
  useEffect(() => {
    setActiveSubTab(defaultValue);
  }, [defaultValue]);

  // Manejar el cambio de subtab
  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value);
    // ✅ USAR FUNCIÓN ESPECÍFICA PARA SUB-PESTAÑAS
    if (currentMainTab) {
      setSubTabCookie(path, currentMainTab, value);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-1 h-full">
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="flex gap-1 justify-start w-fit bg-gh_contrast/50 dark:bg-slate-900">
          {tabsValues.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              id={tab.value}
              className="text-gh_orange font-semibold"
              data-testid={`sub-tab-${tab.value.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div>{tab.name}</div>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsValues.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Suspense fallback={<Skeleton className="h-16 w-full" />}>
              {tab.content.buttonAction && (
                <div className="flex gap-4 py-2 flex-wrap justify-start">{tab.content.buttonAction}</div>
              )}
            </Suspense>

            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <div className="py-2">{tab.content.component}</div>
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
