'use client';

import { ColumnDef, VisibilityState } from '@tanstack/react-table';

import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { createNestedFilterOptions } from '@/shared/utils/table-helpers';
import { Building } from 'lucide-react';

interface DataEquipmentProps<TData, TValue> {
  columns: ColumnDef<VehicleWithBrand, TValue>[];
  data: VehicleWithBrand[];
  role?: string | null;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}

export function EquipmentTable<TData, TValue>({
  columns,
  data,
  role,
  savedFilters,
  savedVisibility,
}: DataEquipmentProps<TData, TValue>) {
  const internNumberOptions = createFilterOptions(data, (doc) => doc?.intern_number);
  const domainOptions = createFilterOptions(data, (doc) => doc?.domain);
  const chassisOptions = createFilterOptions(data, (doc) => doc?.chassis);
  const engineOptions = createFilterOptions(data, (doc) => doc?.engine);
  const serieOptions = createFilterOptions(data, (doc) => doc?.serie);
  const yearOptions = createFilterOptions(data, (doc) => doc?.year);
  const brandOptions = createFilterOptions(data, (doc) => doc?.brand?.name);
  const modelOptions = createFilterOptions(data, (doc) => doc?.model?.name);
  const statusOptions = createFilterOptions(data, (doc) => doc?.status);
  const conditionOptions = createFilterOptions(data, (doc) => doc?.condition);
  const typeOptions = createFilterOptions(data, (doc) => doc?.type?.name);
  const subTypeOptions = createFilterOptions(data, (doc) => doc?.subType?.name);
  const afectacionesOpciones = createNestedFilterOptions(
    data,
    (employee) =>
      employee?.contractor_equipment?.map((contractor) => contractor?.contractor_id?.name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );
  return (
    <>
      <BaseDataTable
        columns={columns}
        data={data}
        savedVisibility={savedVisibility || {}}
        tableId="equipment-table-equipment"
        toolbarOptions={{
          initialVisibleFilters: savedFilters || [],
          filterableColumns: [
            {
              columnId: 'Numero interno',
              title: 'Numero interno',
              options: internNumberOptions,
            },
            {
              columnId: 'Dominio',
              title: 'Dominio',
              options: domainOptions,
            },
            {
              columnId: 'Chassis',
              title: 'Chassis',
              options: chassisOptions,
            },
            {
              columnId: 'Motor',
              title: 'Motor',
              options: engineOptions,
            },
            {
              columnId: 'Serie',
              title: 'Serie',
              options: serieOptions,
            },
            {
              columnId: 'Afectado a',
              title: 'Afectado a',
              options: afectacionesOpciones,
            },
            {
              columnId: 'Año',
              title: 'Año',
              options: yearOptions,
            },
            {
              columnId: 'Condicion',
              title: 'Condicion',
              options: conditionOptions,
            },
            {
              columnId: 'Marca',
              title: 'Marca',
              options: brandOptions,
            },
            {
              columnId: 'Modelo',
              title: 'Modelo',
              options: modelOptions,
            },
            {
              columnId: 'Estado',
              title: 'Estado',
              options: statusOptions,
            },
            {
              columnId: 'Tipo',
              title: 'Tipo',
              options: typeOptions,
            },
            {
              columnId: 'Sub Tipo',
              title: 'Sub Tipo',
              options: subTypeOptions,
            },
          ],
        }}
      />
    </>
  );
}
