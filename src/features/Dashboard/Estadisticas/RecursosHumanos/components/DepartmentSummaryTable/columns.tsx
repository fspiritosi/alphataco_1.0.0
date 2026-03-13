'use client';

import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { DepartmentAbsenceSummaryItem } from '../../actions.server';

// Constantes para colores de ausentismo
const EXPECTED_ABSENTEEISM_PERCENTAGE = 5;
const WARNING_THRESHOLD = 4;

export function getDepartmentSummaryColumns(
  onViewEmployees: (row: DepartmentAbsenceSummaryItem) => void
): ColumnDef<DepartmentAbsenceSummaryItem>[] {
  return [
    {
      accessorKey: 'sector',
      id: 'sector',
      meta: { title: 'Sector' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) => <span className="font-medium">{row.original.sector}</span>,
      filterFn: (row, _id, value: string[]) => value.includes(row.original.sector),
    },
    {
      accessorKey: 'dotacion',
      id: 'dotacion',
      meta: { title: 'Dotación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dotación" />,
      cell: ({ row }) => <div>{row.original.dotacion}</div>,
    },
    {
      accessorKey: 'ausentes',
      id: 'ausentes',
      meta: { title: 'Ausentes' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ausentes" />,
      cell: ({ row }) => <div>{row.original.ausentes}</div>,
    },
    {
      accessorKey: 'porcentaje',
      id: 'porcentaje',
      meta: { title: '% Ausentismo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="% Ausentismo" />,
      cell: ({ row }) => {
        const p = row.original.porcentaje ?? 0;
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
          disabled={row.original.ausentes === 0}
          className="gap-1.5"
        >
          <Users className="h-3.5 w-3.5" />
          Ver ausentes
        </Button>
      ),
    },
  ];
}
