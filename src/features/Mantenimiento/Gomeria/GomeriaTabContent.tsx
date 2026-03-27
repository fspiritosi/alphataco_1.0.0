import { TabsManagerServer } from '@/features/TabsManager';
import { Layers, LayoutTemplate, Package, Tag, Wrench } from 'lucide-react';
import { Suspense } from 'react';
import CatalogoTabContent from './Catalogo/CatalogoTabContent';
import { CatalogoSkeleton } from './Catalogo/fallback/CatalogoSkeleton';
import MarcasTabContent from './Marcas/MarcasTabContent';
import { MarcasSkeleton } from './Marcas/fallback/MarcasSkeleton';
import OrdenesTabContent from './Ordenes/OrdenesTabContent';
import { OrdenesSkeleton } from './Ordenes/fallback/OrdenesSkeleton';
import PlantillasTabContent from './Plantillas/PlantillasTabContent';
import { PlantillasSkeleton } from './Plantillas/fallback/PlantillasSkeleton';
import TiposTabContent from './Tipos/TiposTabContent';
import { TiposSkeleton } from './Tipos/fallback/TiposSkeleton';

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

export default async function GomeriaTabContent({ searchParams, permissions }: Props) {
  return (
    <TabsManagerServer
      paramName="gomeria_tab"
      searchParams={searchParams}
      defaultTab="catalogo_cubiertas"
      permissions={permissions}
      tabs={[
        {
          value: 'catalogo_cubiertas',
          label: (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Catálogo
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'catalogo_cubiertas',
          content: (
            <Suspense fallback={<CatalogoSkeleton />}>
              <CatalogoTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'plantillas_cubiertas',
          label: (
            <span className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" /> Plantillas
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'plantillas_cubiertas',
          content: (
            <Suspense fallback={<PlantillasSkeleton />}>
              <PlantillasTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'ordenes_gomeria',
          label: (
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Órdenes
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'ordenes_gomeria',
          content: (
            <Suspense fallback={<OrdenesSkeleton />}>
              <OrdenesTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'marcas_cubiertas',
          label: (
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4" /> Marcas
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'marcas_cubiertas',
          content: (
            <Suspense fallback={<MarcasSkeleton />}>
              <MarcasTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'tipos_cubiertas',
          label: (
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" /> Tipos
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'tipos_cubiertas',
          content: (
            <Suspense fallback={<TiposSkeleton />}>
              <TiposTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
