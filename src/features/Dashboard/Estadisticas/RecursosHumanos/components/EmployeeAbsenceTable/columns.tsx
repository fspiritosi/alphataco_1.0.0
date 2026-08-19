'use client';

import {
  DataTableColumnHeader,
  inMemoryDateSortingFn,
  inMemoryFacetedFilterFn,
  inMemoryTextFilterFn,
} from '@/shared/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { EmployeeAbsence } from '../../actions.server';

export const employeeAbsenceColumns: ColumnDef<EmployeeAbsence>[] = [
  {
    accessorKey: 'legajo',
    id: 'legajo',
    meta: { title: 'Legajo' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
    cell: ({ row }) => <div className="font-medium">{row.original.legajo}</div>,
    filterFn: inMemoryTextFilterFn,
  },
  {
    accessorKey: 'nombre',
    id: 'nombre',
    meta: { title: 'Nombre' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Apellido y Nombre" />,
    cell: ({ row }) => {
      const emp = row.original;
      return emp.id ? (
        <Link
          href={`/dashboard/employee/action?action=view&employee_id=${emp.id}`}
          className="text-primary hover:underline"
          target="_blank"
        >
          {emp.nombre}
        </Link>
      ) : (
        <span>{emp.nombre}</span>
      );
    },
    filterFn: inMemoryTextFilterFn,
  },
  {
    accessorKey: 'tarea',
    id: 'tarea',
    meta: { title: 'Tarea' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cargo" />,
    cell: ({ row }) => <span>{row.original.tarea || '—'}</span>,
    filterFn: inMemoryFacetedFilterFn,
  },
  {
    accessorKey: 'linea',
    id: 'linea',
    meta: { title: 'Línea' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
    cell: ({ row }) => {
      const linea = row.original.linea;
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
    filterFn: inMemoryFacetedFilterFn,
  },
  {
    accessorKey: 'turno',
    id: 'turno',
    meta: { title: 'Turno' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Turno" />,
    cell: ({ row }) => <span>{row.original.turno || '—'}</span>,
    filterFn: inMemoryFacetedFilterFn,
  },
  {
    accessorKey: 'motivo',
    id: 'motivo',
    meta: { title: 'Motivo' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
    cell: ({ row }) => <span>{row.original.motivo || '—'}</span>,
    filterFn: inMemoryFacetedFilterFn,
  },
  {
    accessorKey: 'desde',
    id: 'desde',
    meta: { title: 'Desde' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Desde" />,
    cell: ({ row }) => <span>{row.original.desde}</span>,
    enableSorting: true,
    sortingFn: inMemoryDateSortingFn,
  },
  {
    accessorKey: 'hasta',
    id: 'hasta',
    meta: { title: 'Hasta' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hasta" />,
    cell: ({ row }) => <span>{row.original.hasta}</span>,
    enableSorting: true,
    sortingFn: inMemoryDateSortingFn,
  },
  {
    accessorKey: 'diasCaidos',
    id: 'diasCaidos',
    meta: { title: 'Días Caídos' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Días Caídos" />,
    cell: ({ row }) => <div className="font-medium">{row.original.diasCaidos}</div>,
    enableSorting: true,
  },
  {
    accessorKey: 'observaciones',
    id: 'observaciones',
    meta: { title: 'Observaciones' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Observaciones" />,
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-xs truncate" title={row.original.observaciones}>
        {row.original.observaciones || '—'}
      </div>
    ),
    filterFn: inMemoryTextFilterFn,
  },
];
