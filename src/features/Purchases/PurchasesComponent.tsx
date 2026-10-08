import { getUserPermissionsMapServer } from '@/features/Permissions';
import { SectionManagerServer } from '@/features/TabsManager';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { ClipboardList, Settings, Truck } from 'lucide-react';
import { Suspense } from 'react';
import RequestsTabContent from './Requests/RequestsTabContent';
import SettingsTabContent from './Settings/SettingsTabContent';
import { PurchasesSettingsSkeleton } from './Settings/fallback/PurchasesSettingsSkeleton';
import SuppliersTabContent from './Suppliers/SuppliersTabContent';
import { PurchasesSectionSkeleton } from './fallback/PurchasesSectionSkeleton';

/**
 * Modulo Compras (spec docs/superpowers/specs/2026-10-08-compras-etapa-1-design.md).
 *
 * Secciones elegidas desde el sidebar (`?tab=`). Los iconos son los mismos que
 * `SUB_ITEM_ICONS` de `navigation.ts`, para que cada seccion se vea igual en los dos lados.
 */
export default async function PurchasesComponent({ searchParams }: { searchParams: DataTableSearchParams }) {
  const permissions = await getUserPermissionsMapServer();

  const label = (Icon: typeof Truck, text: string) => (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );

  return (
    <SectionManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="solicitudes"
      permissions={permissions}
      tabs={[
        {
          value: 'solicitudes',
          label: label(ClipboardList, 'Solicitudes'),
          moduleSlug: 'compras',
          tabSlug: 'solicitudes',
          content: (
            <Suspense fallback={<PurchasesSectionSkeleton />}>
              <RequestsTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'proveedores',
          label: label(Truck, 'Proveedores'),
          moduleSlug: 'compras',
          tabSlug: 'proveedores',
          content: (
            <Suspense fallback={<PurchasesSectionSkeleton />}>
              <SuppliersTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'config-compras',
          label: label(Settings, 'Configuración'),
          moduleSlug: 'compras',
          tabSlug: 'config-compras',
          content: (
            <Suspense fallback={<PurchasesSettingsSkeleton />}>
              <SettingsTabContent permissions={permissions} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
