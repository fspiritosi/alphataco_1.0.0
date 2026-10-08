'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Lo mínimo que necesitan los componentes cliente del MDX (`GuideLink`, `OpenScreen`, `FlowStep`):
 * qué guías puede abrir el usuario, su título y la pantalla principal de cada una. Viaja ya
 * filtrado por permisos desde el servidor: una guía que no está acá es una guía que no ve.
 */
export type ManualGuideRef = {
  slug: string;
  title: string;
  /** URL de la primera pantalla que documenta la guía (null si no declara pantallas). */
  screenHref: string | null;
};

type ManualContextValue = {
  /** Guía que se está leyendo (`<OpenScreen />` sin `to` abre su pantalla). */
  currentSlug: string | null;
  guides: Map<string, ManualGuideRef>;
};

const ManualContext = createContext<ManualContextValue | null>(null);

export function ManualProvider({
  guides,
  currentSlug,
  children,
}: {
  guides: ManualGuideRef[];
  currentSlug: string | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ currentSlug, guides: new Map(guides.map((guide) => [guide.slug, guide])) }),
    [guides, currentSlug]
  );
  return <ManualContext.Provider value={value}>{children}</ManualContext.Provider>;
}

function useManualContext(): ManualContextValue {
  const context = useContext(ManualContext);
  if (!context) throw new Error('Los componentes del manual tienen que ir dentro de <ManualProvider>');
  return context;
}

/** La guía si el usuario puede abrirla; `null` si no existe o no tiene acceso. */
export function useManualGuide(slug: string | undefined): ManualGuideRef | null {
  const { guides, currentSlug } = useManualContext();
  const target = slug ?? currentSlug;
  return target ? (guides.get(target) ?? null) : null;
}
