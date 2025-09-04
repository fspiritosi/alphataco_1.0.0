'use client';

import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';

interface EmployeeAbsence {
  legajo: number;
  nombre: string;
  tarea: string;
  linea: string;
  turno: string;
  motivo: string;
  desde: string;
  hasta: string;
  observaciones: string;
  diasCaidos: number;
}

interface EmployeeAbsenceTableProps {
  data: EmployeeAbsence[];
  savedVisibility: Record<string, boolean>;
  savedFiltersFromCookie: string[];
}

function getEmployeeColumns(): ColumnDef<EmployeeAbsence>[] {
  return [
    {
      accessorKey: 'legajo',
      id: 'Legajo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
      cell: ({ getValue }) => <div className="font-medium">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'nombre',
      id: 'Apellido y Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Apellido y Nombre" />,
    },
    {
      accessorKey: 'tarea',
      id: 'Tarea',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cargo" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'linea',
      id: 'Línea',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ getValue }) => {
        const linea = getValue<string>();
        const cls =
          linea === 'LOGISTICA'
            ? 'bg-blue-100 text-blue-800'
            : linea === 'SERV ESPECIALES'
              ? 'bg-purple-100 text-purple-800'
              : linea === 'ADMINISTRACION'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800';
        return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{linea}</span>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'turno',
      id: 'Turno',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Turno" />,
    },
    // {
    //     accessorKey: "motivo",
    //     id: "Motivo",
    //     header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
    //     cell: ({ getValue }) => {
    //         const motivo = getValue<string>()
    //         const cls =
    //             motivo === "ENFERMEDAD"
    //                 ? "bg-red-100 text-red-800"
    //                 : motivo === "ACCIDENTE"
    //                     ? "bg-orange-100 text-orange-800"
    //                     : "bg-yellow-100 text-yellow-800"
    //         return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{motivo}</span>
    //     },
    //     filterFn: (row, id, value) => {
    //         return value.includes(row.getValue(id))
    //     },
    // },
    {
      accessorKey: 'desde',
      id: 'Desde',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Desde" />,
    },
    {
      accessorKey: 'hasta',
      id: 'Hasta',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hasta" />,
    },
    {
      accessorKey: 'diasCaidos',
      id: 'Días',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Días" />,
      cell: ({ getValue }) => <div className=" font-medium">{getValue<number>()}</div>,
    },
    // {
    //     accessorKey: "observaciones",
    //     id: "Observaciones",
    //     header: ({ column }) => <DataTableColumnHeader column={column} title="Observaciones" />,
    //     cell: ({ getValue }) => (
    //         <div className="text-gray-600 max-w-xs truncate" title={getValue<string>()}>
    //             {getValue<string>()}
    //         </div>
    //     ),
    // },
  ];
}

export function EmployeeAbsenceTableComponent({
  data,
  savedVisibility,
  savedFiltersFromCookie,
}: EmployeeAbsenceTableProps) {
  const tableId = 'employeeAbsenceTable';

  const lineaOptions = createFilterOptions(data, (d) => d.linea);
  const motivoOptions = createFilterOptions(data, (d) => d.motivo);
  const tareaOptions = createFilterOptions(data, (d) => d.tarea);

  return (
    <BaseDataTable
      columns={getEmployeeColumns()}
      data={data}
      savedVisibility={savedVisibility}
      tableId={tableId}
      toolbarOptions={{
        initialVisibleFilters: savedFiltersFromCookie,
        filterableColumns: [
          { columnId: 'Línea', title: 'Línea', options: lineaOptions },
          { columnId: 'Motivo', title: 'Motivo', options: motivoOptions },
          { columnId: 'Tarea', title: 'Tarea', options: tareaOptions },
        ],
      }}
    />
  );
}
