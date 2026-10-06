import { getUserPermissionsMapServer } from '@/features/Permissions';
import { SectionManagerServer } from '@/features/TabsManager';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { ArrowLeftRight, Layers, Package, Settings, Warehouse } from 'lucide-react';
import { Suspense } from 'react';
import DepotsTabContent from './Depots/DepotsTabContent';
import MaterialsTabContent from './Materials/MaterialsTabContent';
import MovementsTabContent from './Movements/MovementsTabContent';
import SettingsTabContent from './Settings/SettingsTabContent';
import { SettingsSkeleton } from './Settings/fallback/SettingsSkeleton';
import StockTabContent from './Stock/StockTabContent';
import { WarehouseSectionSkeleton } from './fallback/WarehouseSectionSkeleton';

/**
 * Modulo Almacenes (spec docs/superpowers/specs/2026-10-04-almacenes-etapa-1-design.md).
 *
 * Cinco secciones elegidas desde el sidebar (`?tab=`). Los iconos son los mismos que
 * `SUB_ITEM_ICONS` de `navigation.ts`, para que cada seccion se vea igual en los dos lados.
 */
export default async function WarehousesComponent({ searchParams }: { searchParams: DataTableSearchParams }) {
  const permissions = await getUserPermissionsMapServer();

  const label = (Icon: typeof Layers, text: string) => (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );

  return (
    <SectionManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="stock"
      permissions={permissions}
      tabs={[
        {
          value: 'stock',
          label: label(Layers, 'Stock'),
          moduleSlug: 'almacenes',
          tabSlug: 'stock',
          content: (
            <Suspense fallback={<WarehouseSectionSkeleton />}>
              <StockTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'movimientos',
          label: label(ArrowLeftRight, 'Movimientos'),
          moduleSlug: 'almacenes',
          tabSlug: 'movimientos',
          content: (
            <Suspense fallback={<WarehouseSectionSkeleton />}>
              <MovementsTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'materiales',
          label: label(Package, 'Materiales'),
          moduleSlug: 'almacenes',
          tabSlug: 'materiales',
          content: (
            <Suspense fallback={<WarehouseSectionSkeleton />}>
              <MaterialsTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'depositos',
          label: label(Warehouse, 'Depósitos'),
          moduleSlug: 'almacenes',
          tabSlug: 'depositos',
          content: (
            <Suspense fallback={<WarehouseSectionSkeleton />}>
              <DepotsTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'config-almacen',
          label: label(Settings, 'Configuración'),
          moduleSlug: 'almacenes',
          tabSlug: 'config-almacen',
          content: (
            <Suspense fallback={<SettingsSkeleton />}>
              <SettingsTabContent permissions={permissions} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
