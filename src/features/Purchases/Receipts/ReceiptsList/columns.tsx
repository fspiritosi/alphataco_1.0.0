'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, CheckCircle2, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { PurchaseReceiptListItem } from './actions.server';

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['created_at'];

/** Valores del filtro de estado (derivado de `cancelled_at`). */
export const RECEIPT_STATUS_ACTIVE = 'active';
export const RECEIPT_STATUS_CANCELLED = 'cancelled';
export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  [RECEIPT_STATUS_ACTIVE]: 'Vigente',
  [RECEIPT_STATUS_CANCELLED]: 'Anulada',
};
export const receiptStatusIcons: Record<string, LucideIcon> = {
  [RECEIPT_STATUS_ACTIVE]: CheckCircle2,
  [RECEIPT_STATUS_CANCELLED]: Ban,
};

export const NO_WAREHOUSE_LABEL = 'Sin depósito (servicios)';

const statusOf = (row: PurchaseReceiptListItem) => (row.cancelled ? RECEIPT_STATUS_CANCELLED : RECEIPT_STATUS_ACTIVE);
const formatDateTime = (value: Date | string | null) => (value ? moment(value).format('DD/MM/YYYY') : '-');
/** Columnas DATE (sin hora): se leen en UTC para no correr un dia. */
const formatDateOnly = (value: Date | string | null) => (value ? moment.utc(value).format('DD/MM/YYYY') : '-');

export function getColumns(): ColumnDef<PurchaseReceiptListItem>[] {
  return [
    {
      id: 'number',
      accessorKey: 'number',
      meta: { title: 'Número' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/purchases/receipts/${row.original.id}`}
          className="font-mono text-sm font-medium text-blue-600 hover:underline"
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      id: 'received_on',
      accessorKey: 'received_on',
      meta: { title: 'Fecha de recepción' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de recepción" />,
      cell: ({ row }) => <span>{formatDateOnly(row.original.received_on)}</span>,
    },
    {
      id: 'order',
      accessorFn: (row) => row.order.number,
      meta: { title: 'Orden de compra' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orden de compra" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/purchases/orders/${row.original.order.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.original.order.number}
        </Link>
      ),
      filterFn: (row, _id, value: string[]) => value.includes(row.original.order.id),
    },
    {
      id: 'supplier',
      accessorFn: (row) => row.supplier.name,
      meta: { title: 'Proveedor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Proveedor" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/purchases/suppliers/${row.original.supplier.id}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.supplier.name}
        </Link>
      ),
      filterFn: (row, _id, value: string[]) => value.includes(row.original.supplier.id),
    },
    {
      id: 'warehouse',
      accessorFn: (row) => row.warehouse?.name ?? NO_WAREHOUSE_LABEL,
      meta: { title: 'Depósito' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Depósito" />,
      cell: ({ row }) =>
        row.original.warehouse ? (
          <span>{row.original.warehouse.name}</span>
        ) : (
          <span className="text-muted-foreground">{NO_WAREHOUSE_LABEL}</span>
        ),
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.warehouse?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },
    {
      id: 'delivery_note',
      accessorKey: 'delivery_note',
      meta: { title: 'Remito' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remito" />,
      cell: ({ row }) => <span>{row.original.delivery_note ?? '-'}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => RECEIPT_STATUS_LABELS[statusOf(row)],
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = statusOf(row.original);
        const Icon = receiptStatusIcons[status];
        return status === RECEIPT_STATUS_CANCELLED ? (
          <Badge variant="destructive" className="gap-1">
            <Icon className="h-3 w-3" />
            {RECEIPT_STATUS_LABELS[status]}
          </Badge>
        ) : (
          <Badge className="gap-1 bg-green-600 text-white">
            <Icon className="h-3 w-3" />
            {RECEIPT_STATUS_LABELS[status]}
          </Badge>
        );
      },
      filterFn: (row, _id, value: string[]) => value.includes(statusOf(row.original)),
    },
    {
      id: 'requests',
      accessorFn: (row) => row.requests.map((r) => r.number).join(', '),
      meta: { title: 'Solicitudes de origen' },
      // M:M (via lineas): no ordenable.
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Solicitudes de origen" />,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-x-2">
          {row.original.requests.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/purchases/requests/${r.id}`}
              className="font-mono text-sm text-blue-600 hover:underline"
            >
              {r.number}
            </Link>
          ))}
        </div>
      ),
      filterFn: (row, _id, value: string[]) => row.original.requests.some((r) => value.includes(r.id)),
    },
    {
      id: 'creator',
      accessorFn: (row) => row.creator.name,
      meta: { title: 'Creó' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creó" />,
      cell: ({ row }) => <span>{row.original.creator.name}</span>,
      filterFn: (row, _id, value: string[]) => value.includes(row.original.creator.id),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha de alta' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de alta" />,
      cell: ({ row }) => <span>{formatDateTime(row.original.created_at)}</span>,
    },
  ];
}
