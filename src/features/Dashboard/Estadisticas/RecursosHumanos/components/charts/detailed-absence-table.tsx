'use client';

import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';

interface DailyAbsence {
  fecha: string;
  dotacion: number;
  altas: number;
  bajas: number;
  vacaciones: number;
  totalDotacion: number;
  totalAusentes: number;
  porcentajeAusentismo: number;
}

interface DetailedAbsenceTableProps {
  data: DailyAbsence[];
  savedVisibility: Record<string, boolean>;
  savedFiltersFromCookie: string[];
}

function getDetailedColumns(): ColumnDef<DailyAbsence>[] {
  return [
    {
      accessorKey: 'fecha',
      id: 'Fecha',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'dotacion',
      id: 'Dotación',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dotación" />,
      cell: ({ getValue }) => <div className="">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'altas',
      id: 'Altas',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Altas" />,
      cell: ({ getValue }) => <div className=" text-green-600">{getValue<number>() || '-'}</div>,
    },
    {
      accessorKey: 'bajas',
      id: 'Bajas',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bajas" />,
      cell: ({ getValue }) => <div className=" text-red-600">{getValue<number>() || '-'}</div>,
    },
    {
      accessorKey: 'totalDotacion',
      id: 'Total Dotación',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Dotación" />,
      cell: ({ getValue }) => <div className=" font-medium">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'totalAusentes',
      id: 'Total Ausentes',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Ausentes" />,
      cell: ({ getValue }) => <div className="">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'porcentajeAusentismo',
      id: '% Ausentismo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="% Ausentismo" />,
      cell: ({ getValue }) => {
        const p = getValue<number>() ?? 0;
        const cls =
          p > 3 ? 'bg-red-100 text-red-800' : p > 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        return (
          <div className="">
            <span className={`px-2 py-1 rounded text-xs ${cls}`}>{p.toFixed(2)}%</span>
          </div>
        );
      },
    },
  ];
}

export function DetailedAbsenceTableComponent({
  data,
  savedVisibility,
  savedFiltersFromCookie,
}: DetailedAbsenceTableProps) {
  const tableId = 'detailedAbsenceTable';
  const fechaOptions = createFilterOptions(data, (d) => d.fecha);

  return (
    <BaseDataTable
      columns={getDetailedColumns()}
      data={data}
      savedVisibility={savedVisibility}
      tableId={tableId}
      toolbarOptions={{
        initialVisibleFilters: savedFiltersFromCookie,
        filterableColumns: [
          {
            columnId: 'Fecha',
            title: 'Fecha',
            options: fechaOptions,
          },
        ],
      }}
    />
  );
}
