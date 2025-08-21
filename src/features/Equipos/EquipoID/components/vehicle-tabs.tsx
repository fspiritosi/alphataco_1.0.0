'use client';
import { fetchAllContractorForVehicles } from '@/app/dashboard/employee/action/actions/actions';
import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { VehicleAssignmentDataForm } from '../forms/vehicle-assignment-data-form';
import { VehicleBasicDataForm } from '../forms/vehicle-basic-data-form';
import {
  getModelsByBrand,
  getSubTypesByType,
  getTypesOfVehicles,
  getVehicleBrands,
  getVehicleTypes,
} from '../lib/actions/vehicle-catalog-actions';

// Tipo para los datos del formulario de vehículo
export type VehicleFormData = {
  type_of_vehicle: string;
  brand: string;
  model: string;
  year: string;
  engine?: string;
  type?: string;
  subType?: string;
  chassis?: string;
  serie?: string;
  domain?: string;
  kilometer?: string;
  intern_number?: string;
  picture?: string;
  allocated_to?: string[];
  cost_center_id?: string;
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
  documentsComponent?: React.ReactNode;
  repairsComponent?: React.ReactNode;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
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
  documentsComponent,
  repairsComponent,
  typesPromise,
  subTypesPromise,
}: VehicleTabsProps) {
  const readOnly = mode === 'view';
  const showDocuments = vehicleId && mode !== 'new';
  const showRepairs = vehicleId && mode !== 'new';

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
    ];
    // const technicalDataFields = ['engine', 'type', 'subType', 'chassis', 'serie', 'domain'];
    const assignmentDataFields = ['allocated_to', 'cost_center_id'];

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

  return (
    <div className="p-2">
      <Tabs defaultValue="basicData" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basicData" className="relative">
            Datos Básicos
            {errors?.basicData && <Badge variant="destructive" className="ml-2 h-2 w-2 p-0" />}
          </TabsTrigger>
          <TabsTrigger value="assignmentData" className="relative">
            Asignación
            {errors?.assignmentData && <Badge variant="destructive" className="ml-2 h-2 w-2 p-0" />}
          </TabsTrigger>
          <TabsTrigger value="documents" disabled={!showDocuments}>
            Documentos
          </TabsTrigger>
          <TabsTrigger value="repairs" disabled={!showRepairs}>
            Reparaciones
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="basicData" className="space-y-4">
            <VehicleBasicDataForm
              brandsPromise={brandsPromise}
              modelsPromise={modelsPromise}
              typesPromise={typesPromise}
              subTypesPromise={subTypesPromise}
              typesOfVehiclesPromise={typesOfVehiclesPromise}
              form={form}
              readOnly={readOnly}
            />
          </TabsContent>
          {/* <TabsContent value="technicalData" className="space-y-4">
            <VehicleTechnicalDataForm
              typesPromise={typesPromise}
              subTypesPromise={subTypesPromise}
              typesOfVehiclesPromise={typesOfVehiclesPromise}
              form={form}
              readOnly={readOnly}
            />
          </TabsContent> */}
          <TabsContent value="assignmentData" className="space-y-4">
            <VehicleAssignmentDataForm
              contractorsPromise={contractorsPromise}
              costCentersPromise={costCentersPromise}
              form={form}
              readOnly={readOnly}
            />
          </TabsContent>
          {showDocuments && (
            <TabsContent value="documents" className="space-y-4">
              {documentsComponent}
            </TabsContent>
          )}
          {showRepairs && (
            <TabsContent value="repairs" className="space-y-4">
              {repairsComponent}
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
