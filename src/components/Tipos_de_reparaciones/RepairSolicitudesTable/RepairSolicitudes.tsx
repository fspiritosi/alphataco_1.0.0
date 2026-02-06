'use client';
import { querySelectDistinct } from '@/app/server/GET/probando';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { fetchAllRepairSolicitudesData, fetchRepairSolicitudes } from '../actions/actions';
import { repairSolicitudesColums } from './components/columns';
import { mechanicColums } from './components/mechanicColumns';

export type RepairSolicitudeData = Awaited<ReturnType<typeof fetchRepairSolicitudes>>['rows'][0];
export default function RepairSolicitudes({
  mechanic,
  initialData,
  savedFilters,
  savedVisibility,
}: {
  mechanic?: boolean;
  initialData?: Awaited<ReturnType<typeof fetchRepairSolicitudes>>;
  default_equipment_id?: string;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  const company_id = Cookies.get('actualComp');

  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllRepairSolicitudesData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: true,
    });
    return result.rows; // Solo devolver los datos, no la estructura de paginación
  };

  return (
    <>
      <BaseDataTable
        columns={mechanic ? mechanicColums : repairSolicitudesColums}
        savedVisibility={savedVisibility}
        initialData={initialData}
        tableId="repair-solicitudes-table"
        enableRowSelection={true}
        serverSide={true}
        fetchData={fetchRepairSolicitudes}
        fetchAllData={handleFetchAllData}
        queryKey="repair-solicitudes-supabase"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          showExport: true,
          filterableColumns: [
            {
              columnId: 'created_at',
              title: 'Fecha',
              type: 'date-range',
              fromPlaceholder: 'Desde (Fecha)',
              toPlaceholder: 'Hasta (Fecha)',
              showFrom: true,
              showTo: true,
            },
            {
              columnId: 'vehicles.domain',
              title: 'Dominio',
              config: {
                tableName: 'repair_solicitudes',
                relation: '{"vehicles": "equipment_id"}',
                select: 'vehicles.domain' as '*',
                // p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (
                  data: Awaited<ReturnType<typeof querySelectDistinct<'repair_solicitudes', 'vehicles.domain'>>>
                ) => {
                  return data.map((value) => ({
                    label: String(value.display_value || 'Sin dominio'),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
                },
              },
            },
            {
              columnId: 'vehicles.type.name',
              title: 'Tipo de equipo',
              config: {
                tableName: 'repair_solicitudes',
                select: 'type.name' as '*',
                multiJoinPaths: {
                  joins: [
                    {
                      from_table: 'repair_solicitudes',
                      to_table: 'vehicles',
                      from_column: 'equipment_id',
                      to_column: 'id',
                    },
                    {
                      from_table: 'vehicles',
                      to_table: 'type',
                      from_column: 'type',
                      to_column: 'id',
                    },
                  ],
                  final_column: 'type.name',
                },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'repair_solicitudes', 'type.name'>>>) => {
                  return data
                    .filter((value) => value.col_value !== null)
                    .map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                },
              },
            },
            {
              columnId: 'vehicles.sub_type.name',
              title: 'Sub tipo',
              config: {
                tableName: 'repair_solicitudes' as const,
                select: 'sub_type.name' as '*',
                multiJoinPaths: {
                  joins: [
                    {
                      from_table: 'repair_solicitudes',
                      to_table: 'vehicles',
                      from_column: 'equipment_id',
                      to_column: 'id',
                    },
                    {
                      from_table: 'vehicles',
                      to_table: 'sub_type',
                      from_column: 'subType', // columna en vehicles que referencia sub_type
                      to_column: 'id',
                    },
                  ],
                  final_column: 'sub_type.name',
                },
                mapper: (
                  data: Awaited<ReturnType<typeof querySelectDistinct<'repair_solicitudes', 'sub_type.name'>>>
                ) => {
                  return data.map((value) => ({
                    label: String(value.display_value || 'Sin subtipo'),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
                },
              },
            },
            {
              columnId: 'types_of_repairs.name',
              title: 'Tipo de reparación',
              config: {
                tableName: 'repair_solicitudes',
                select: 'types_of_repairs.name' as '*',
                relation: '{"types_of_repairs": "reparation_type"}',
                // p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'types_of_repairs', 'name'>>>) => {
                  return data.map((value) => ({
                    label: String(value.display_value || 'Sin tipo de reparación'),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
                },
              },
            },
            {
              columnId: 'state',
              title: 'Estado',
              config: {
                tableName: 'repair_solicitudes' as const,
                select: 'state' as '*',
                // p_filters: { company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'repair_solicitudes', 'state'>>>) => {
                  return data.map((value) => ({
                    label: String(value.display_value || 'Sin estado'),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
                },
              },
            },
            {
              columnId: 'types_of_repairs.criticity',
              title: 'Prioridad',
              config: {
                tableName: 'types_of_repairs' as const,
                select: 'criticity' as '*',
                // p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'types_of_repairs', 'criticity'>>>) => {
                  return data.map((value) => ({
                    label: String(value.display_value || 'Sin prioridad'),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
                },
              },
            },
          ],
          showFilterOptions: true,
        }}
      />
    </>
  );
}
