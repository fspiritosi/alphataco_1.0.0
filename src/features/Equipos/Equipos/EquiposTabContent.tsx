import { TabsManagerServer } from '@/features/TabsManager';
import { Car, Package, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import { OtherEquipmentTabContent } from '../OtherEquipment/OtherEquipmentTabContent';
import { OtherEquipmentTableSkeleton } from '../OtherEquipment/fallback/OtherEquipmentTableSkeleton';
import DadosDeBajaTabContent from './DadosDeBaja/DadosDeBajaTabContent';
import { VehicleTabContent } from './VehicleList/VehicleTabContent';
import { VehicleTableSkeleton } from './VehicleList/fallback/VehicleTableSkeleton';

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
      dependentParams={['inactive_subtab']}
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
            <Suspense fallback={<VehicleTableSkeleton />}>
              <VehicleTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'others',
          label: (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipamiento
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
          content: <DadosDeBajaTabContent searchParams={searchParams} permissions={permissions} />,
        },
      ]}
    />
  );
}
