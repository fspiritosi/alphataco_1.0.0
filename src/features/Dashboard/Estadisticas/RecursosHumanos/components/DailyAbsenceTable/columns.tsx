'use client';

import { Button } from '@/components/ui/button';
import { DataTableColumnHeader, inMemoryDateSortingFn } from '@/shared/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { DailyAbsenceTimeseriesItem } from '../../actions.server';

// Constantes para colores de ausentismo
const EXPECTED_ABSENTEEISM_PERCENTAGE = 5;
const WARNING_THRESHOLD = 4;

export function getDailyAbsenceColumns(
  onViewEmployees: (row: DailyAbsenceTimeseriesItem) => void
): ColumnDef<DailyAbsenceTimeseriesItem>[] {
  return [
    {
      accessorKey: 'fecha',
      id: 'fecha',
      meta: { title: 'Fecha' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <span className="font-medium">{row.original.fecha}</span>,
      sortingFn: inMemoryDateSortingFn,
    },
    {
      accessorKey: 'dotacion',
      id: 'dotacion',
      meta: { title: 'Dotación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dotación" />,
      cell: ({ row }) => <div>{row.original.dotacion}</div>,
    },
    {
      accessorKey: 'altas',
      id: 'altas',
      meta: { title: 'Altas' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Altas" />,
      cell: ({ row }) => <div className="text-green-600 font-medium">{row.original.altas || '-'}</div>,
    },
    {
      accessorKey: 'bajas',
      id: 'bajas',
      meta: { title: 'Bajas' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bajas" />,
      cell: ({ row }) => <div className="text-red-600 font-medium">{row.original.bajas || '-'}</div>,
    },
    {
      accessorKey: 'vacaciones',
      id: 'vacaciones',
      meta: { title: 'Vacaciones' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vacaciones" />,
      cell: ({ row }) => <div>{row.original.vacaciones || '-'}</div>,
    },
    {
      accessorKey: 'totalDotacion',
      id: 'totalDotacion',
      meta: { title: 'Total Dotación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Dotación" />,
      cell: ({ row }) => <div className="font-medium">{row.original.totalDotacion}</div>,
    },
    {
      accessorKey: 'totalAusentes',
      id: 'totalAusentes',
      meta: { title: 'Total Ausentes' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Ausentes" />,
      cell: ({ row }) => <div>{row.original.totalAusentes}</div>,
    },
    {
      accessorKey: 'porcentajeAusentismo',
      id: 'porcentajeAusentismo',
      meta: { title: '% Ausentismo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="% Ausentismo" />,
      cell: ({ row }) => {
        const p = row.original.porcentajeAusentismo ?? 0;
        const cls =
          p > EXPECTED_ABSENTEEISM_PERCENTAGE
            ? 'bg-red-100 text-red-800'
            : p >= WARNING_THRESHOLD
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800';
        return (
          <div>
            <span className={`px-2 py-1 rounded text-xs ${cls}`}>{p.toFixed(2)}%</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewEmployees(row.original)}
          disabled={row.original.totalAusentes === 0}
          className="gap-1.5"
        >
          <Users className="h-3.5 w-3.5" />
          Ver ausentes
        </Button>
      ),
    },
  ];
}
