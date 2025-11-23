'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ModuleSlug } from '@/features/Permissions/permissions-map';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TabsManagerClientProps } from './types';

/**
 * TabsManagerClient - Componente cliente para gestionar pestañas con estado en URL y tipado fuerte.
 *
 * OPTIMIZACIÓN:
 * - Usa estado local (useState) para navegación instantánea.
 * - Usa window.history.replaceState para actualizar la URL sin disparar una navegación de Next.js.
 * - Esto evita que se muestren fallbacks de Suspense o estados de carga al cambiar de pestaña.
 *
 * PERMISOS:
 * - Las tabs ya vienen filtradas desde TabsManagerServer según permisos del usuario.
 * - Este componente solo renderiza las tabs que el usuario tiene permiso de ver.
 *
 * @example
 * ```tsx
 * // Este componente normalmente se usa internamente por TabsManagerServer
 * // No necesitas usarlo directamente en la mayoría de casos
 * ```
 */
export function TabsManagerClient<M extends ModuleSlug = ModuleSlug>({
  paramName,
  tabs,
  defaultTab,
  dependentParams = [],
}: TabsManagerClientProps<M>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Inicializar estado: leer de URL o usar default
  const getInitialTab = () => {
    const paramValue = searchParams.get(paramName);
    const isValidTab = paramValue && tabs.some((t) => t.value === paramValue);
    return isValidTab ? paramValue : defaultTab;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // Sincronizar SOLO si searchParams cambia externamente (ej. navegación atrás/adelante)
  // IMPORTANTE: No incluir activeTab en las dependencias para evitar revertir el estado
  // cuando searchParams está desactualizado (debido a replaceState).
  useEffect(() => {
    const currentUrlValue = searchParams.get(paramName);
    // Solo actualizar si hay un valor en la URL, es diferente al actual, y es válido
    if (currentUrlValue && currentUrlValue !== activeTab && tabs.some((t) => t.value === currentUrlValue)) {
      setActiveTab(currentUrlValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /**
   * Manejador de cambio de pestaña.
   * Actualiza el estado local inmediatamente y la URL silenciosamente.
   */
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;

    // 1. Actualización Inmediata de UI
    setActiveTab(newTab);

    // 2. Actualización Silenciosa de URL (sin roundtrip al servidor)
    // Usamos window.location.search para asegurarnos de tener los params más recientes
    // ya que searchParams (hook) puede estar desactualizado si hubo navegaciones previas con replaceState
    const params = new URLSearchParams(window.location.search);
    params.set(paramName, newTab);

    // Limpiar parámetros dependientes
    dependentParams.forEach((dependentParam) => {
      params.delete(dependentParam);
    });

    const newUrl = `${pathname}?${params.toString()}`;

    // Usar History API nativa para reemplazar la URL sin notificar a Next.js
    window.history.replaceState(null, '', newUrl);
  };

  return (
    <div className="flex flex-col gap-6 py-1 h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex gap-1 justify-start w-fit bg-muted/50 dark:bg-slate-900">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-gh_orange font-semibold"
              data-testid={`tab-${tab.value.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="py-2">{tab.content}</div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
