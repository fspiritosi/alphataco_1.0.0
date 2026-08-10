'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  type PreEmployeeStatus,
} from '@/features/Employees/PreLegajos/lib/state-machine';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, Eye, Send, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { PreEmployeeListItem } from './actions.server';

// ============================================================================
// ICONS (exportados para uso en filtros)
// ============================================================================

export const statusIcons: Record<PreEmployeeStatus, LucideIcon> = {
  en_proceso: Clock,
  pre_ingreso: Send,
  rechazado: XCircle,
  legajo: CheckCircle2,
};

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT = ['cuil', 'phone', 'email', 'rejection_reason', 'created_at', 'reviewed_at'];

// ============================================================================
// COLUMNS
// ============================================================================

export function getColumns(): ColumnDef<PreEmployeeListItem>[] {
  return [
    // --- Select ---
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { excludeFromExport: true },
    },

    // --- Pre Legajo (N°) ---
    {
      id: 'pre_file_number',
      accessorKey: 'pre_file_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pre Legajo" />,
      cell: ({ row }) => (
        // Sin color de link: en la tabla de empleados el legajo es texto plano.
        // Igual navega al detalle; el subrayado en hover lo delata como clickeable.
        <Link
          href={`/dashboard/employee/pre-legajo?action=view&pre_employee_id=${row.original.id}`}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.original.pre_file_number}
        </Link>
      ),
      meta: { title: 'Pre Legajo' },
    },

    // --- Nombre completo ---
    {
      id: 'fullName',
      accessorFn: (row) => `${row.lastname ?? ''} ${row.firstname ?? ''}`.trim(),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre completo" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/employee/pre-legajo?action=view&pre_employee_id=${row.original.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.original.lastname} {row.original.firstname}
        </Link>
      ),
      enableSorting: false,
      meta: { title: 'Nombre completo' },
    },

    // --- DNI ---
    {
      id: 'document_number',
      accessorKey: 'document_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="DNI" />,
      cell: ({ row }) => <span>{row.original.document_number ?? '-'}</span>,
      meta: { title: 'DNI' },
    },

    // --- CUIL (oculta por defecto) ---
    {
      id: 'cuil',
      accessorKey: 'cuil',
      header: ({ column }) => <DataTableColumnHeader column={column} title="CUIL" />,
      cell: ({ row }) => <span>{row.original.cuil ?? '-'}</span>,
      meta: { title: 'CUIL' },
    },

    // --- Estado ---
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const Icon = statusIcons[status];
        return (
          <Badge variant={STATUS_VARIANTS[status]} className="gap-1">
            {Icon && <Icon className="h-3 w-3" />}
            {STATUS_LABELS[status]}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id) as string),
      meta: { title: 'Estado' },
    },

    // --- Sector propuesto ---
    {
      id: 'hierarchy',
      accessorFn: (row) => row.hierarchy?.name ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector propuesto" />,
      cell: ({ row }) => <span>{row.original.hierarchy?.name ?? '-'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.hierarchy?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      meta: { title: 'Sector propuesto' },
    },

    // --- Puesto propuesto ---
    {
      id: 'company_positions',
      accessorFn: (row) => row.company_positions?.name ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto propuesto" />,
      cell: ({ row }) => <span>{row.original.company_positions?.name ?? '-'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.company_positions?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      meta: { title: 'Puesto propuesto' },
    },

    // --- Telefono (oculta por defecto) ---
    {
      id: 'phone',
      accessorKey: 'phone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Telefono" />,
      cell: ({ row }) => <span>{row.original.phone ?? '-'}</span>,
      meta: { title: 'Telefono' },
    },

    // --- Email (oculta por defecto) ---
    {
      id: 'email',
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <span>{row.original.email ?? '-'}</span>,
      meta: { title: 'Email' },
    },

    // --- Motivo de rechazo (oculta por defecto) ---
    {
      id: 'rejection_reason',
      accessorKey: 'rejection_reason',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo de rechazo" />,
      cell: ({ row }) => <span>{row.original.rejection_reason ?? '-'}</span>,
      meta: { title: 'Motivo de rechazo' },
    },

    // --- Creado (oculta por defecto) ---
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
      cell: ({ row }) => <span>{moment(row.original.created_at).format('DD/MM/YYYY')}</span>,
      meta: { title: 'Creado' },
    },

    // --- Revisado (oculta por defecto) ---
    {
      id: 'reviewed_at',
      accessorKey: 'reviewed_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Revisado" />,
      cell: ({ row }) => (
        <span>{row.original.reviewed_at ? moment(row.original.reviewed_at).format('DD/MM/YYYY') : '-'}</span>
      ),
      meta: { title: 'Revisado' },
    },

    // --- Acciones ---
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/employee/pre-legajo?action=view&pre_employee_id=${row.original.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Ver
          </Link>
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { title: '', excludeFromExport: true },
    },
  ];
}
