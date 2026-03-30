import { fetchAllTypesOfRepairs } from '@/features/Mantenimiento/TiposReparaciones/actions/actions';
import { Suspense } from 'react';
import { getActiveExternalWorkshops, getActiveWorkshopSectors } from '../OrderManagement/actions/actionsServer';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '../utils/constants';
import { MaintenanceOrdersSkeleton } from './fallback/MaintenanceOrdersSkeleton';
import { MaintenanceOrderList } from './table/MaintenanceOrderList';

/**
 * Tab de Órdenes de Mantenimiento - Taller
 *
 * Muestra las órdenes de mantenimiento con su progreso por sectores.
 * Los datos del wizard (sectors, repairTypes, externalWorkshops) se cargan
 * en el servidor y se pasan como props serializables hasta el Client Component.
 */
export async function MaintenanceOrdersTabContent({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const [sectorsData, repairTypesData, externalWorkshopsData] = await Promise.all([
    getActiveWorkshopSectors(),
    fetchAllTypesOfRepairs(),
    getActiveExternalWorkshops(),
  ]);

  const repairTypes = repairTypesData
    .filter((r) => r.id !== DIAGNOSTICO_REPAIR_TYPE_ID)
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <Suspense fallback={<MaintenanceOrdersSkeleton />}>
      <MaintenanceOrderList
        searchParams={searchParams ?? {}}
        sectors={sectorsData}
        repairTypes={repairTypes}
        externalWorkshops={externalWorkshopsData}
      />
    </Suspense>
  );
}
