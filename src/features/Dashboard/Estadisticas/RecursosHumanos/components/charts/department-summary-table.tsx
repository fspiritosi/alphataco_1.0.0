'use client';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';

interface DepartmentData {
  sector: string;
  dotacion: number;
  ausentes: number;
  porcentaje: number;
}

interface DepartmentSummaryTableProps {
  data: DepartmentData[];
  savedVisibility: Record<string, boolean>;
  savedFiltersFromCookie: string[];
}

function getDepartmentColumns(): ColumnDef<DepartmentData>[] {
  return [
    {
      accessorKey: 'sector',
      id: 'Sector',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
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
      accessorKey: 'ausentes',
      id: 'Ausentes',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ausentes" />,
      cell: ({ getValue }) => <div className="">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'porcentaje',
      id: '%',
      header: ({ column }) => <DataTableColumnHeader column={column} title="%" />,
      cell: ({ getValue }) => {
        const p = getValue<number>() ?? 0;
        const cls =
          p > 5 ? 'bg-red-100 text-red-800' : p > 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        return (
          <div className="">
            <span className={`px-2 py-1 rounded text-xs ${cls}`}>{p.toFixed(2)}%</span>
          </div>
        );
      },
    },
  ];
}

export function DepartmentSummaryTableComponent({
  data,
  savedVisibility,
  savedFiltersFromCookie,
}: DepartmentSummaryTableProps) {
  const tableId = 'departmentSummaryTable';
  const sectorOptions = createFilterOptions(data, (d) => d.sector);

  return (
    <BaseDataTable
      columns={getDepartmentColumns()}
      data={data}
      savedVisibility={savedVisibility}
      tableId={tableId}
      toolbarOptions={{
        initialVisibleFilters: savedFiltersFromCookie,
        filterableColumns: [
          {
            columnId: 'Sector',
            title: 'Sector',
            options: sectorOptions,
          },
        ],
      }}
    />
  );
}
