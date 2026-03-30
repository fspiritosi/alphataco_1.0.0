'use client';

import { DataTable, type DataTableFacetedFilterConfig } from '@/shared/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { EmployeeAbsence } from '../../actions.server';
import { employeeAbsenceColumns } from './columns';

// DataTable requires TData extends Record<string, unknown>.
// EmployeeAbsence is a typed interface, so we cast to satisfy the constraint.
type EmployeeAbsenceRecord = EmployeeAbsence & Record<string, unknown>;

interface Props {
  data: EmployeeAbsence[];
  title?: string;
  tableId?: string;
}

export function _EmployeeAbsenceDataTable({ data, title: _title, tableId = 'employee-absence' }: Props) {
  const castedData = data as EmployeeAbsenceRecord[];
  // Para tablas client-side puras (datos por prop), los filtros faceted se calculan
  // desde los datos disponibles en memoria usando useMemo.
  const tareaOptions = useMemo(() => {
    const unique = Array.from(new Set(data.map((d) => d.tarea).filter(Boolean)));
    return unique.sort().map((v) => ({ value: v, label: v }));
  }, [data]);

  const lineaOptions = useMemo(() => {
    const unique = Array.from(new Set(data.map((d) => d.linea).filter(Boolean)));
    return unique.sort().map((v) => ({ value: v, label: v }));
  }, [data]);

  const turnoOptions = useMemo(() => {
    const unique = Array.from(new Set(data.map((d) => d.turno).filter(Boolean)));
    return unique.sort().map((v) => ({ value: v, label: v }));
  }, [data]);

  const motivoOptions = useMemo(() => {
    const unique = Array.from(new Set(data.map((d) => d.motivo).filter(Boolean)));
    return unique.sort().map((v) => ({ value: v, label: v }));
  }, [data]);

  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'legajo',
        title: 'Legajo',
        type: 'text',
        placeholder: 'Buscar por legajo...',
      },
      {
        columnId: 'nombre',
        title: 'Nombre',
        type: 'text',
        placeholder: 'Buscar por nombre...',
      },
      {
        columnId: 'tarea',
        title: 'Cargo',
        options: tareaOptions,
      },
      {
        columnId: 'linea',
        title: 'Sector',
        options: lineaOptions,
      },
      {
        columnId: 'turno',
        title: 'Turno',
        options: turnoOptions,
      },
      {
        columnId: 'motivo',
        title: 'Motivo',
        options: motivoOptions,
      },
      {
        columnId: 'observaciones',
        title: 'Observaciones',
        type: 'text',
        placeholder: 'Buscar en observaciones...',
      },
    ],
    [tareaOptions, lineaOptions, turnoOptions, motivoOptions]
  );

  const exportConfig = useMemo(
    () => ({
      fetchAllData: async () => castedData,
      options: {
        filename: 'ausencias-empleados',
        sheetName: 'Ausencias',
        title: 'Detalle de Ausencias por Empleado',
      },
    }),
    [castedData]
  );

  return (
    <DataTable
      columns={employeeAbsenceColumns as ColumnDef<EmployeeAbsenceRecord>[]}
      data={castedData}
      totalRows={castedData.length}
      facetedFilters={facetedFilters}
      searchPlaceholder="Buscar por legajo o nombre..."
      showSearch
      showFilterToggle
      emptyMessage="No hay ausencias registradas."
      exportConfig={exportConfig}
      tableId={tableId}
      paramNamespace={tableId}
    />
  );
}
