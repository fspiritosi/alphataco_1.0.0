'use client';
import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { Badge } from '@/components/ui/badge';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { fetchAllContractorForVehicles } from '@/features/Equipos/EquipoID/actions/vehicle-actions';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';
import type { TabDefinition } from '@/features/TabsManager/types';
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { VehicleAssignmentDataForm } from '../forms/vehicle-assignment-data-form';
import { VehicleBasicDataForm } from '../forms/vehicle-basic-data-form';
import {
  getModelsByBrand,
  getSubTypesByType,
  getTypesOfVehicles,
  getVehicleBrands,
  getVehicleOwnersType,
  getVehicleTypes,
} from '../lib/actions/vehicle-catalog-actions';

// Tipo para los datos del formulario de vehículo
export type VehicleFormData = {
  type_of_vehicle: string;
  brand: string;
  owner_id: string | null;
  model: string | null;
  year: string;
  engine?: string;
  type?: string | null;
  subType?: string | null;
  chassis?: string;
  serie?: string;
  domain?: string;
  kilometer?: string;
  engine_hours?: string;
  intern_number?: string;
  picture?: string | null;
  allocated_to?: string[];
  cost_center_id?: string | null;
  cost_type: 'Directo' | 'Indirecto';
  sector: string;
  type_of_contract?: string | null;
  contract_expiration_date?: Date | null;
  contract_start_date?: Date | null;
  contract_number?: string;
  price?: number;
  currency?: 'USD' | 'EUR' | 'GBP' | 'ARS';
};

interface VehicleTabsProps {
  vehicle?: VehicleById;
  mode: 'view' | 'edit' | 'new';
  vehicleId?: string;
  form: UseFormReturn<VehicleFormData>;
  brandsPromise: ReturnType<typeof getVehicleBrands>;
  modelsPromise: ReturnType<typeof getModelsByBrand>;
  typesOfVehiclesPromise: ReturnType<typeof getTypesOfVehicles>;
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  hierarchicalPositionsPromise: Promise<Array<{ id: string; name: string }>>;
  documentsComponent?: React.ReactNode;
  repairsComponent?: React.ReactNode;
  qrComponent?: React.ReactNode;
  checklistsComponent?: React.ReactNode;
  operationsComponent?: React.ReactNode;
  tiresComponent?: React.ReactNode;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
  ownersPromise: Promise<getVehicleOwnersType>;
}

export function VehicleTabs({
  vehicle,
  mode,
  vehicleId,
  form,
  brandsPromise,
  modelsPromise,
  typesOfVehiclesPromise,
  contractorsPromise,
  costCentersPromise,
  hierarchicalPositionsPromise,
  documentsComponent,
  qrComponent,
  repairsComponent,
  checklistsComponent,
  operationsComponent,
  tiresComponent,
  typesPromise,
  subTypesPromise,
  ownersPromise,
}: VehicleTabsProps) {
  const readOnly = mode === 'view';
  const showDocuments = vehicleId && mode !== 'new';
  const showRepairs = vehicleId && mode !== 'new';
  const showChecklists = vehicleId && mode !== 'new';
  const showOperations = vehicleId && mode !== 'new';

  const [errors, setErrors] = useState<{
    basicData: boolean;
    // technicalData: boolean;
    assignmentData: boolean;
  }>({
    basicData: false,
    // technicalData: false,
    assignmentData: false,
  });

  useEffect(() => {
    const basicDataFields = [
      'type_of_vehicle',
      'brand',
      'model',
      'year',
      'engine',
      'type',
      'subType',
      'chassis',
      'serie',
      'domain',
      'owner_id',
      'type_of_contract',
      'contract_expiration_date',
      'contract_start_date',
    ];
    // const technicalDataFields = ['engine', 'type', 'subType', 'chassis', 'serie', 'domain'];
    const assignmentDataFields = ['allocated_to', 'cost_center_id', 'cost_type', 'sector'];

    const basicDataErrors = basicDataFields.some(
      (field) => form.formState.errors[field as keyof typeof form.formState.errors]
    );
    // const technicalDataErrors = technicalDataFields.some(
    //   (field) => form.formState.errors[field as keyof typeof form.formState.errors]
    // );
    const assignmentDataErrors = assignmentDataFields.some(
      (field) => form.formState.errors[field as keyof typeof form.formState.errors]
    );

    setErrors({
      basicData: basicDataErrors,
      // technicalData: technicalDataErrors,
      assignmentData: assignmentDataErrors,
    });
  }, [form.formState.errors]);

  const tabs = [
    {
      value: 'basicData',
      label: (
        <div className="relative">
          Datos Básicos
          {errors?.basicData && <Badge variant="destructive" className="ml-2 h-2 w-2 p-0" />}
        </div>
      ),
      moduleSlug: 'equipos',
      tabSlug: 'datos-basicos',
      content: (
        <div className="space-y-4">
          <VehicleBasicDataForm
            ownersPromise={ownersPromise}
            brandsPromise={brandsPromise}
            modelsPromise={modelsPromise}
            typesPromise={typesPromise}
            subTypesPromise={subTypesPromise}
            typesOfVehiclesPromise={typesOfVehiclesPromise}
            form={form}
            readOnly={readOnly}
          />
        </div>
      ),
    },
    {
      value: 'assignmentData',
      label: (
        <div className="relative">
          Asignación
          {errors?.assignmentData && <Badge variant="destructive" className="ml-2 h-2 w-2 p-0" />}
        </div>
      ),
      moduleSlug: 'equipos',
      tabSlug: 'asignacion',
      content: (
        <div className="space-y-4">
          <VehicleAssignmentDataForm
            contractorsPromise={contractorsPromise}
            costCentersPromise={costCentersPromise}
            hierarchicalPositionsPromise={hierarchicalPositionsPromise}
            form={form}
            readOnly={readOnly}
          />
        </div>
      ),
    },
    {
      value: 'documents',
      label: 'Documentos',
      // Hereda permisos de documentacion/documentos-de-equipos
      moduleSlug: 'documentacion',
      tabSlug: 'documentos-de-equipos',
      disabled: !showDocuments,
      content: showDocuments ? <div className="space-y-4">{documentsComponent}</div> : null,
    },
    {
      value: 'repairs',
      label: 'Reparaciones',
      // Hereda permisos de equipos/type_of_repairs
      moduleSlug: 'equipos',
      tabSlug: 'type_of_repairs',
      disabled: !showRepairs,
      content: showRepairs ? <div className="space-y-4">{repairsComponent}</div> : null,
    },
    {
      value: 'qr',
      label: 'QR',
      moduleSlug: 'equipos',
      tabSlug: 'qr-equipo',
      content: <div className="space-y-4">{qrComponent}</div>,
    },
    {
      value: 'operations',
      label: 'Operaciones',
      moduleSlug: 'mantenimiento',
      tabSlug: 'ordenes_mantenimiento',
      disabled: !showOperations,
      content: showOperations ? <div className="space-y-4">{operationsComponent}</div> : null,
    },
    {
      value: 'checklists',
      label: 'Checklist',
      moduleSlug: 'equipos',
      tabSlug: 'checklist-equipo',
      disabled: !showChecklists,
      content: showChecklists ? <div className="space-y-4">{checklistsComponent}</div> : null,
    },
    {
      value: 'tires',
      label: 'Cubiertas',
      moduleSlug: 'equipos',
      tabSlug: 'cubiertas-equipo',
      disabled: mode === 'new',
      content: tiresComponent ?? <div />,
    },
  ] satisfies TabDefinition[];

  return (
    <div className="">
      <TabsManagerClientSide
        paramName="tab"
        defaultTab="basicData"
        tabs={tabs}
        listClassName="grid w-full grid-cols-8"
        triggerClassName="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      />
    </div>
  );
}
