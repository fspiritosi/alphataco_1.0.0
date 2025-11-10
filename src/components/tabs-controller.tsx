'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { setMainTabCookie } from '@/shared/actions/actions';
import Cookies from 'js-cookie';
import type React from 'react';
import { Suspense, useEffect, useState } from 'react';

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

export async function setMainTabCookieClientSide(path: string, mainTab: string) {
  const cookieKey = `main_tab_${path.replace(/\//g, '_')}`;
  Cookies.set(cookieKey, mainTab);
}
export function TabsController({ defaultValue, tabsValues, path }: TabsControllerProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultValue);

  // Inicializar con el valor por defecto
  useEffect(() => {
    setActiveTab(defaultValue);
  }, [defaultValue]);

  // Manejar el cambio de tab principal
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // ✅ USAR FUNCIÓN ESPECÍFICA PARA PESTAÑAS PRINCIPALES
    setMainTabCookie(path, value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div></div>
      <TabsList className="flex gap-1 justify-start w-fit bg-gh dark:bg-slate-950">
        {tabsValues.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            id={tab.value}
            className="text-gh_orange font-semibold"
            data-testid={`main-tab-${tab.value.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div>{tab.name}</div>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabsValues.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <Card className="overflow-visible">
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <CardContent className="py-4 px-4 relative">{tab.content.component}</CardContent>
            </Suspense>
            <CardFooter className="flex flex-row items-center border-t bg-gh/70 dark:bg-muted/50 px-6 py-3"></CardFooter>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
