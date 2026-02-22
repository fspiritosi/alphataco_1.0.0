import { getVehicleById } from '@/features/Equipos/EquipoID/lib/actions/vehicle-actions';
import { VehicleHeaderSkeleton } from '@/features/Equipos/EquipoID/skeletons/vehicle-header-skeleton';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import BackButton from '@/components/BackButton';
import DocumentEquipmentComponent from '@/components/DocumentEquipmentComponent';
import RepairTypes from '@/components/Tipos_de_reparaciones/RepairTypes';
import { Card } from '@/components/ui/card';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { VehicleChecklistsTabContent } from '@/features/Equipos/EquipoID/components/vehicle-checklists-tab-content';
import { VehicleForm } from '@/features/Equipos/EquipoID/components/vehicle-form';
import { VehicleHeader } from '@/features/Equipos/EquipoID/components/vehicle-header';
import VehicleQr from '@/features/Equipos/EquipoID/components/vehicle-qr';
import {
  getHierarchicalPositions,
  getModelsByBrand,
  getSubTypesByType,
  getTypesOfVehicles,
  getVehicleBrands,
  getVehicleOwners,
  getVehicleTypes,
} from '@/features/Equipos/EquipoID/lib/actions/vehicle-catalog-actions';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { fetchAllContractorForVehicles } from '../../employee/action/actions/actions';

// Componentes de Otros Equipos
import {
  getOtherEquipmentById,
  getOtherEquipmentCertifications,
  getVehiclesForSelect,
} from '@/features/Equipos/OtherEquipment/actions/actionsServer';
import { OtherEquipmentCertifications } from '@/features/Equipos/OtherEquipment/components/OtherEquipmentCertifications';
import { OtherEquipmentForm } from '@/features/Equipos/OtherEquipment/components/OtherEquipmentForm';
import { OtherEquipmentHeader } from '@/features/Equipos/OtherEquipment/components/OtherEquipmentHeader';
import { OtherEquipmentQr } from '@/features/Equipos/OtherEquipment/components/OtherEquipmentQr';
import { OtherEquipmentHeaderSkeleton } from '@/features/Equipos/OtherEquipment/fallback/OtherEquipmentHeaderSkeleton';

interface VehiclePageProps {
  searchParams: Promise<{ action?: 'new' | 'edit' | 'view'; id?: string; type?: string }>;
}

export type VehicleById = Awaited<ReturnType<typeof getVehicleById>> | null;
export type OtherEquipmentById = Awaited<ReturnType<typeof getOtherEquipmentById>> | null;

export default async function VehiclePage({ searchParams }: VehiclePageProps) {
  const resolvedSearchParams = await searchParams;
  const id = resolvedSearchParams.id;
  const mode = resolvedSearchParams.action || 'view';
  const isOtherEquipment = resolvedSearchParams.type === 'other';

  const permissions = await getUserPermissionsMapServer();

  // ─── OTROS EQUIPOS ────────────────────────────────────────────────────────

  if (isOtherEquipment) {
    let equipment: OtherEquipmentById = null;

    if (mode !== 'new') {
      try {
        equipment = await getOtherEquipmentById(id!);
      } catch {
        notFound();
      }
    }

    const actualMode = mode === 'new' || !id ? 'new' : mode;

    // Catálogos compartidos con vehículos
    const brandsPromise = getVehicleBrands();
    const typesPromise = getVehicleTypes();
    const ownersPromise = getVehicleOwners();
    const modelsPromise = getModelsByBrand(equipment?.brand_vehicles?.id ?? 0);
    const subTypesPromise = getSubTypesByType(equipment?.type?.id ?? '');
    const contractorsPromise = fetchAllContractorForVehicles();
    const costCentersPromise = fetchAllCostCenters();
    const hierarchicalPositionsPromise = getHierarchicalPositions();
    const vehiclesPromise = getVehiclesForSelect();

    // Certificaciones (solo cuando hay equipo)
    const certificationsData = equipment?.id ? await getOtherEquipmentCertifications(equipment.id) : [];

    return (
      <div className="p-6 space-y-6">
        <Card className="p-4">
          {/* Header del equipo */}
          {actualMode !== 'new' ? (
            <Suspense fallback={<OtherEquipmentHeaderSkeleton />}>
              <OtherEquipmentHeader mode={actualMode as 'view' | 'edit'} equipment={equipment!} />
            </Suspense>
          ) : (
            <div className="flex justify-end p-4 pb-0">
              <BackButton />
            </div>
          )}

          {/* Formulario del equipo */}
          <OtherEquipmentForm
            equipmentId={equipment?.id}
            mode={actualMode as 'view' | 'edit' | 'new'}
            equipment={equipment}
            brandsPromise={brandsPromise}
            modelsPromise={modelsPromise}
            typesPromise={typesPromise}
            subTypesPromise={subTypesPromise}
            ownersPromise={ownersPromise}
            contractorsPromise={contractorsPromise}
            costCentersPromise={costCentersPromise}
            hierarchicalPositionsPromise={hierarchicalPositionsPromise}
            vehiclesPromise={vehiclesPromise}
            certificationsComponent={
              equipment?.id ? (
                <OtherEquipmentCertifications equipmentId={equipment.id} initialData={certificationsData} />
              ) : null
            }
            qrComponent={
              equipment?.id && equipment.type?.generates_qr ? (
                <OtherEquipmentQr
                  equipmentId={equipment.id}
                  equipmentLabel={equipment.serial_number || equipment.intern_number || equipment.id}
                />
              ) : null
            }
          />
        </Card>
      </div>
    );
  }

  // ─── VEHÍCULOS (comportamiento original) ──────────────────────────────────

  let vehicle: null | VehicleById = null;

  if (mode !== 'new') {
    try {
      vehicle = await getVehicleById(id!);
    } catch {
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
          hierarchicalPositionsPromise={getHierarchicalPositions()}
          documentsComponent={<DocumentEquipmentComponent id={vehicle?.id || ''} searchParams={resolvedSearchParams} />}
          repairsComponent={
            <RepairTypes
              searchParams={resolvedSearchParams}
              equipment_id={resolvedSearchParams.id}
              moduleSlug="equipos"
              permissions={permissions}
              hiddenTabs={[
                'equipments_with_deviations',
                'type_of_repair',
                'type_of_repair_new_entry',
                'maintenance_groups',
                'maintenance_requests',
                'maintenance_orders',
                'maintenance_operations',
              ]}
            />
          }
          qrComponent={<VehicleQr vehicle={vehicle} />}
          checklistsComponent={<VehicleChecklistsTabContent equipmentId={vehicle?.id || ''} />}
        />
      </Card>
    </div>
  );
}

export async function generateMetadata({ searchParams }: VehiclePageProps) {
  const resolvedSearchParams = await searchParams;
  const id = resolvedSearchParams.id;
  const mode = resolvedSearchParams.action || 'view';
  const isOtherEquipment = resolvedSearchParams.type === 'other';

  if (mode === 'new') {
    return {
      title: isOtherEquipment ? 'Nuevo Otro Equipo' : 'Nuevo Equipo',
      description: isOtherEquipment ? 'Crear un nuevo equipo (otros)' : 'Crear un nuevo equipo',
    };
  }

  if (isOtherEquipment) {
    try {
      const equipment = await getOtherEquipmentById(id!);
      return {
        title: `Equipo - ${equipment.serial_number || equipment.intern_number || 'Sin identificador'}`,
        description: `Detalles del equipo: ${equipment.type?.name || ''}`,
      };
    } catch {
      return { title: 'Equipo no encontrado', description: 'El equipo solicitado no existe' };
    }
  }

  try {
    const vehicle = await getVehicleById(id!);
    return {
      title: `Equipo - ${vehicle.domain || vehicle.serie}`,
      description: `Detalles del equipo ${vehicle.brand} ${vehicle.model}`,
    };
  } catch {
    return {
      title: 'Equipo no encontrado',
      description: 'El equipo solicitado no existe',
    };
  }
}
