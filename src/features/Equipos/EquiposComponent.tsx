import { SectionManagerServer } from '@/features/TabsManager';
import { Car, Package, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import DadosDeBajaTabContent from './Equipos/DadosDeBaja/DadosDeBajaTabContent';
import { VehicleTabContent } from './Equipos/VehicleList/VehicleTabContent';
import { VehicleTableSkeleton } from './Equipos/VehicleList/fallback/VehicleTableSkeleton';
import { OtherEquipmentTabContent } from './OtherEquipment/OtherEquipmentTabContent';
import { OtherEquipmentTableSkeleton } from './OtherEquipment/fallback/OtherEquipmentTableSkeleton';

/**
 * Secciones del modulo Equipos: Vehiculos, Equipamiento y Dados de Baja.
 *
 * Antes eran subtabs de una seccion "Equipos" que convivia con "Documentos de Equipos",
 * "Tipos de Documentos" y "Mantenimiento". Esas tres se sacaron porque ya se llega a ellas
 * desde su modulo propio (Documentacion, Configuracion > Documentos y Mantenimiento), y las
 * subtabs subieron a primer nivel para que el sidebar las muestre como sub-items.
 *
 * Los permisos no cambiaron: siguen siendo las subtabs `vehicles`/`others`/`inactive` de la
 * tab `equipos`, que `createTabVisibilityChecker` encuentra a cualquier profundidad.
 */
export default async function EquiposComponent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <div>
      <SectionManagerServer
        paramName="tab"
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
    </div>
  );
}
