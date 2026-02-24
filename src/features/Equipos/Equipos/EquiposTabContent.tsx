import { TabsManagerServer } from '@/features/TabsManager';
import { DataTableSkeleton } from '@/shared/components/data-table/base/data-table-skeleton';
import { Car, Package, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import { OtherEquipmentTabContent } from '../OtherEquipment/OtherEquipmentTabContent';
import { OtherEquipmentTableSkeleton } from '../OtherEquipment/fallback/OtherEquipmentTableSkeleton';
import EquipmentTableWrapperServer from './components/EquipmentTableWrapperServer';
import EquipmentTableWrapperServerInactive from './components/EquipmentTableWrapperServerInactive';

export default function EquiposTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="vehicles"
      permissions={permissions}
      tabs={[
        {
          value: 'vehicles',
          label: (
            <span className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehículos
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'vehicles',
          content: (
            <Suspense fallback={<DataTableSkeleton columns={7} />}>
              <EquipmentTableWrapperServer types_of_vehicles="Vehículos" />
            </Suspense>
          ),
        },
        {
          value: 'others',
          label: (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Otros
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'others',
          content: (
            <Suspense fallback={<OtherEquipmentTableSkeleton />}>
              <OtherEquipmentTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'inactive',
          label: (
            <span className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Dados de Baja
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'inactive',
          content: (
            <Suspense fallback={<DataTableSkeleton columns={7} />}>
              <EquipmentTableWrapperServerInactive types_of_vehicles="all" />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
