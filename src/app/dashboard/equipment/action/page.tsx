import { getVehicleById } from '@/features/Equipos/EquipoID/lib/actions/vehicle-actions';
import { VehicleHeaderSkeleton } from '@/features/Equipos/EquipoID/skeletons/vehicle-header-skeleton';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import BackButton from '@/components/BackButton';
import DocumentEquipmentComponent from '@/components/DocumentEquipmentComponent';
import RepairTypes from '@/components/Tipos_de_reparaciones/RepairTypes';
import { Card } from '@/components/ui/card';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { VehicleForm } from '@/features/Equipos/EquipoID/components/vehicle-form';
import { VehicleHeader } from '@/features/Equipos/EquipoID/components/vehicle-header';
import {
  getModelsByBrand,
  getSubTypesByType,
  getTypesOfVehicles,
  getVehicleBrands,
  getVehicleOwners,
  getVehicleTypes,
} from '@/features/Equipos/EquipoID/lib/actions/vehicle-catalog-actions';
import { getRole } from '@/lib/utils/getRole';
import { fetchAllContractorForVehicles } from '../../employee/action/actions/actions';

interface VehiclePageProps {
  searchParams: { action?: 'new' | 'edit' | 'view'; id?: string };
}

export type VehicleById = Awaited<ReturnType<typeof getVehicleById>> | null;

export default async function VehiclePage({ searchParams }: VehiclePageProps) {
  const id = searchParams.id;
  const mode = searchParams.action || 'view';
  const role = await getRole();

  let vehicle: null | VehicleById = null;

  if (mode !== 'new') {
    try {
      vehicle = await getVehicleById(id!);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      notFound();
    }
  }

  const actualMode = id === 'new' ? 'new' : mode;

  return (
    <div className="p-6 space-y-6">
      <Card className="p-4">
        {/* Vehicle Header */}
        {mode !== 'new' ? (
          <Suspense fallback={<VehicleHeaderSkeleton />}>
            <VehicleHeader mode={actualMode} vehicle={vehicle} />
          </Suspense>
        ) : (
          <div className="flex justify-end p-4 pb-0">
            <BackButton />
          </div>
        )}

        {/* Vehicle Form */}
        <VehicleForm
          vehicleId={vehicle?.id}
          mode={mode}
          vehicle={vehicle}
          contractorsPromise={fetchAllContractorForVehicles()}
          costCentersPromise={fetchAllCostCenters()}
          brandsPromise={getVehicleBrands()}
          typesPromise={getVehicleTypes()}
          ownersPromise={getVehicleOwners()}
          subTypesPromise={getSubTypesByType(vehicle?.type.id!)}
          modelsPromise={getModelsByBrand(vehicle?.brand_vehicles?.id!)}
          typesOfVehiclesPromise={getTypesOfVehicles()}
          documentsComponent={<DocumentEquipmentComponent id={vehicle?.id || ''} role={role} />}
          repairsComponent={
            <RepairTypes
              tabValue="created_solicitudes"
              equipment_id={searchParams.id}
              type_of_repair_new_entry
              created_solicitudes
              defaultValue="created_solicitudes"
              hiddenTabs={['type_of_repair']}
            />
          }
        />
      </Card>
    </div>
  );
}

export async function generateMetadata({ searchParams }: VehiclePageProps) {
  const id = searchParams.id;
  const mode = searchParams.action || 'view';

  if (mode === 'new') {
    return {
      title: 'Nuevo Equipo',
      description: 'Crear un nuevo equipo',
    };
  }

  try {
    const vehicle = await getVehicleById(id!);
    return {
      title: `Equipo - ${vehicle.domain || vehicle.serie}`,
      description: `Detalles del equipo ${vehicle.brand} ${vehicle.model}`,
    };
  } catch (error) {
    return {
      title: 'Equipo no encontrado',
      description: 'El equipo solicitado no existe',
    };
  }
}
