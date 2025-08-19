'use client';

import { ColumnDef, VisibilityState } from '@tanstack/react-table';

import { createNestedFilterOptions } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { Building } from 'lucide-react';
import { SetStateAction } from 'react';
import { getActiveEquipmentsForDailyReport } from '../actions/actions';

interface DataEquipmentProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[] | any;
  data: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;
  role?: string | null;
  savedFilters: string[];
  savedVisibility: VisibilityState;
  setSelectedEquipment?: (value: SetStateAction<string[]>) => void;
}

export function EquipmentDiagramTable<TData, TValue>({
  columns,
  data,
  role,
  savedFilters,
  savedVisibility,
  setSelectedEquipment,
}: DataEquipmentProps<TData, TValue>) {
  const internNumberOptions = createFilterOptions(data, (doc) => doc?.intern_number);
  const domainOptions = createFilterOptions(data, (doc) => doc?.domain);
  const chassisOptions = createFilterOptions(data, (doc) => doc?.chassis);
  const engineOptions = createFilterOptions(data, (doc) => doc?.engine);
  const serieOptions = createFilterOptions(data, (doc) => doc?.serie);
  const yearOptions = createFilterOptions(data, (doc) => doc?.year);
  const brandOptions = createFilterOptions(data, (doc) => doc?.brand_vehicles?.name);
  const modelOptions = createFilterOptions(data, (doc) => doc?.model_vehicles?.name);
  const statusOptions = createFilterOptions(data, (doc) => doc?.status);
  const conditionOptions = createFilterOptions(data, (doc) => doc?.condition);
  const typeOptions = createFilterOptions(data, (doc) => doc?.type?.name);
  const subTypeOptions = createFilterOptions(data, (doc) => doc?.sub_type?.name);
  const afectacionesOpciones = createNestedFilterOptions(
    data,
    (employee) =>
      employee?.contractor_equipment?.map((contractor) => contractor?.customers?.name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );
  return (
    <>
      <BaseDataTable
        columns={columns}
        data={data}
        savedVisibility={savedVisibility || {}}
        onRowSelectionChange={(rows) => {
          if (setSelectedEquipment) {
            const selectedEquipmentId = rows.map((row) => row.id);
            setSelectedEquipment(selectedEquipmentId);
          }
        }}
        tableId="equipment-table-equipment"
        toolbarOptions={{
          initialVisibleFilters: savedFilters || [],
          filterableColumns: [
            {
              columnId: 'intern_number',
              title: 'Numero interno',
              options: internNumberOptions,
            },
            {
              columnId: 'domain',
              title: 'Dominio',
              options: domainOptions,
            },
            {
              columnId: 'chassis',
              title: 'Chassis',
              options: chassisOptions,
            },
            {
              columnId: 'engine',
              title: 'Motor',
              options: engineOptions,
            },
            {
              columnId: 'serie',
              title: 'Serie',
              options: serieOptions,
            },
            {
              columnId: 'contractor_equipment.customers.name',
              title: 'Afectado a',
              options: afectacionesOpciones,
            },
            {
              columnId: 'year',
              title: 'Año',
              options: yearOptions,
            },
            {
              columnId: 'condition',
              title: 'Condición',
              options: conditionOptions,
            },
            {
              columnId: 'brand_vehicles.name',
              title: 'Marca',
              options: brandOptions,
            },
            {
              columnId: 'model_vehicles.name',
              title: 'Modelo',
              options: modelOptions,
            },
            {
              columnId: 'status',
              title: 'Estado',
              options: statusOptions,
            },
            {
              columnId: 'type.name',
              title: 'Tipo',
              options: typeOptions,
            },
            {
              columnId: 'sub_type.name',
              title: 'Sub Tipo',
              options: subTypeOptions,
            },
          ],
        }}
      />
    </>
  );
}
