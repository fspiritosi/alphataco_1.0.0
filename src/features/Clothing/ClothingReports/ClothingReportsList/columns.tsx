'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DeliveryReceiptButton } from '@/features/Clothing/pdf/DeliveryReceiptButton';
import { clothingDeliveryTypeBadges, clothingDeliveryTypeLabels } from '@/features/Clothing/utils/mappers';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import moment from 'moment';
import type { ClothingReportListItem } from './actions.server';

// ============================================================================
// COLUMNS HIDDEN BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT = ['notes', 'created_at'];

// ============================================================================
// COLUMNS
// ============================================================================

export function getColumns(): ColumnDef<ClothingReportListItem>[] {
  return [
    // ── select ────────────────────────────────────────────────────────────────
    {
      id: 'select',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todas las visibles"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar entrega"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },

    // ── delivered_at ──────────────────────────────────────────────────────────
    {
      accessorKey: 'delivered_at',
      id: 'delivered_at',
      meta: { title: 'Fecha de entrega' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de entrega" />,
      cell: ({ row }) => (row.original.delivered_at ? moment(row.original.delivered_at).format('DD/MM/YYYY') : '-'),
    },

    // ── employee_file — legajo del receptor ───────────────────────────────────
    {
      id: 'employee_file',
      accessorFn: (row) => row.employees_clothing_deliveries_employee_idToemployees?.file ?? '',
      meta: { title: 'Legajo Receptor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
      cell: ({ row }) => {
        const file = row.original.employees_clothing_deliveries_employee_idToemployees?.file;
        return <span className="font-mono text-xs">{file ?? '-'}</span>;
      },
    },

    // ── employee — FK ─────────────────────────────────────────────────────────
    {
      id: 'employee',
      meta: { title: 'Empleado' },
      accessorFn: (row) => {
        const emp = row.employees_clothing_deliveries_employee_idToemployees;
        if (!emp) return '-';
        return `${emp.lastname} ${emp.firstname}`;
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
      cell: ({ row }) => {
        const emp = row.original.employees_clothing_deliveries_employee_idToemployees;
        if (!emp) return <span className="text-muted-foreground">-</span>;
        return (
          <span>
            {emp.lastname} {emp.firstname}
          </span>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const empId = row.original.employee_id;
        if (empId == null) return false;
        return value.includes(empId);
      },
    },

    // ── delivered_by_file — legajo del que entrega ────────────────────────────
    {
      id: 'delivered_by_file',
      accessorFn: (row) => row.employees_clothing_deliveries_delivered_by_idToemployees?.file ?? '',
      meta: { title: 'Legajo Entregado por' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo (entregó)" />,
      cell: ({ row }) => {
        const file = row.original.employees_clothing_deliveries_delivered_by_idToemployees?.file;
        return <span className="font-mono text-xs">{file ?? '-'}</span>;
      },
    },

    // ── delivered_by — FK ─────────────────────────────────────────────────────
    {
      id: 'delivered_by',
      meta: { title: 'Entregado por' },
      accessorFn: (row) => {
        const emp = row.employees_clothing_deliveries_delivered_by_idToemployees;
        if (!emp) return '-';
        return `${emp.lastname} ${emp.firstname}`;
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entregado por" />,
      cell: ({ row }) => {
        const emp = row.original.employees_clothing_deliveries_delivered_by_idToemployees;
        if (!emp) return <span className="text-muted-foreground">-</span>;
        return (
          <span>
            {emp.lastname} {emp.firstname}
          </span>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const empId = row.original.delivered_by_id;
        if (empId == null) return false;
        return value.includes(empId);
      },
    },

    // ── delivery_type — enum ──────────────────────────────────────────────────
    {
      accessorKey: 'delivery_type',
      id: 'delivery_type',
      meta: { title: 'Tipo de entrega' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de entrega" />,
      cell: ({ row }) => {
        const type = row.original.delivery_type;
        return <Badge variant={clothingDeliveryTypeBadges[type]}>{clothingDeliveryTypeLabels[type]}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id) as string);
      },
    },

    // ── items_summary — virtual (no filter) ───────────────────────────────────
    {
      id: 'items_summary',
      meta: { title: 'Artículos' },
      enableSorting: false,
      accessorFn: (row) => row.clothing_delivery_items.length,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Artículos" />,
      cell: ({ row }) => {
        const count = row.original.clothing_delivery_items.length;
        return (
          <span className="text-sm text-muted-foreground">
            {count} artículo{count !== 1 ? 's' : ''}
          </span>
        );
      },
    },

    // ── has_signature — computed boolean ───────────────────────────────────────
    {
      id: 'has_signature',
      meta: { title: 'Firma' },
      enableSorting: false,
      accessorFn: (row) => (row.signature_url != null ? 'true' : 'false'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Firma" />,
      cell: ({ row }) => {
        const hasSig = row.original.signature_url != null;
        return hasSig ? (
          <span className="flex items-center gap-1 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-xs">Con firma</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="text-xs">Sin firma</span>
          </span>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const val = row.original.signature_url != null ? 'true' : 'false';
        return value.includes(val);
      },
    },

    // ── notes (hidden by default) ─────────────────────────────────────────────
    {
      accessorKey: 'notes',
      id: 'notes',
      meta: { title: 'Notas' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Notas" />,
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground">{row.original.notes ?? '-'}</span>
      ),
    },

    // ── created_at (hidden by default) ─────────────────────────────────────────
    {
      accessorKey: 'created_at',
      id: 'created_at',
      meta: { title: 'Fecha de registro' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de registro" />,
      cell: ({ row }) => (row.original.created_at ? moment(row.original.created_at).format('DD/MM/YYYY') : '-'),
    },

    // ── actions — PDF download ──────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <DeliveryReceiptButton deliveryId={row.original.id} compact />,
    },
  ];
}
