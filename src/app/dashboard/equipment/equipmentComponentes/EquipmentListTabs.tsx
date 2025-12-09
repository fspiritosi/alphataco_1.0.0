import { TabsManagerServer } from '@/features/TabsManager';
import { Car, Package, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import EquipmentTableWrapperServer from './EquipmentTableWrapperServer';
import EquipmentTableWrapperServerInactive from './EquipmentTableWrapperServerInactive';
import OtrosEquipmentTableWrapperServer from './OnlyEquipmentTableWrapperServer';

export default async function EquipmentListTabs({
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
            <Suspense fallback={<div>Cargando vehículos...</div>}>
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
            <Suspense fallback={<div>Cargando otros equipos...</div>}>
              <OtrosEquipmentTableWrapperServer types_of_vehicles="Otros" />
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
            <Suspense fallback={<div>Cargando equipos dados de baja...</div>}>
              <EquipmentTableWrapperServerInactive types_of_vehicles="all" />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
