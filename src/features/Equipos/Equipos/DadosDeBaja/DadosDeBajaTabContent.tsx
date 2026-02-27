import { TabsManagerServer } from '@/features/TabsManager';
import { Car, Package } from 'lucide-react';
import { Suspense } from 'react';
import { InactiveOtherEquipmentList } from './OtrosEquipos/InactiveOtherEquipmentList';
import { InactiveOtherEquipmentTableSkeleton } from './OtrosEquipos/fallback/InactiveOtherEquipmentTableSkeleton';
import { InactiveVehicleList } from './Vehiculos/InactiveVehicleList';
import { InactiveVehicleTableSkeleton } from './Vehiculos/fallback/InactiveVehicleTableSkeleton';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

/**
 * Contenido de la subtab "Dados de Baja".
 * Contiene 2 subtabs internas: Vehículos y Otros Equipos.
 */
export default function DadosDeBajaTabContent({ searchParams, permissions }: Props) {
  return (
    <TabsManagerServer
      paramName="inactive_subtab"
      searchParams={searchParams}
      defaultTab="inactive_vehicles"
      permissions={permissions}
      tabs={[
        {
          value: 'inactive_vehicles',
          label: (
            <span className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehículos
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'inactive',
          content: (
            <Suspense fallback={<InactiveVehicleTableSkeleton />}>
              <InactiveVehicleList searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'inactive_others',
          label: (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Otros Equipos
            </span>
          ),
          moduleSlug: 'equipos',
          tabSlug: 'inactive',
          content: (
            <Suspense fallback={<InactiveOtherEquipmentTableSkeleton />}>
              <InactiveOtherEquipmentList searchParams={searchParams} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
