'use client';

import { formatMoney } from '@/features/Warehouses/lib/format';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { CBTE_TYPES, isCbteTypeId } from '@/shared/lib/arca/catalogs';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import Link from 'next/link';
import { ARCA_CHECK_LABELS, SUPPLIER_INVOICE_STATUS_LABELS } from '../../lib/invoice-status';
import { SupplierInvoiceStatusBadge } from '../components/SupplierInvoiceStatusBadge';
import type { SupplierInvoiceListItem } from './actions.server';

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['supplier_cuit', 'vat_period', 'due_date', 'created_at'];

/** Tipos de comprobante que se cargan en la etapa 4 (los habilitados del catalogo). */
export const INVOICE_CBTE_TYPE_IDS = [1, 2, 3, 6, 7, 8, 11, 12, 13] as const;

export const cbteTypeLabel = (id: number) => (isCbteTypeId(id) ? CBTE_TYPES[id].label : String(id));

export const NO_ARCA_CHECK_LABEL = 'Sin constatar';
export const NO_ORDER_LABEL = 'Sin OC';

const arcaLabel = (value: SupplierInvoiceListItem['arca_check_result']) =>
  value ? ARCA_CHECK_LABELS[value] : NO_ARCA_CHECK_LABEL;

/** Columnas DATE (sin hora): se leen en UTC para no correr un dia. */
const formatDateOnly = (value: Date | string | null) => (value ? moment.utc(value).format('DD/MM/YYYY') : '-');

export function getColumns(): ColumnDef<SupplierInvoiceListItem>[] {
  return [
    {
      id: 'number',
      accessorFn: (row) => row.label,
      meta: { title: 'Comprobante' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Comprobante" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/purchases/invoices/${row.original.id}`}
          className="font-mono text-sm font-medium text-blue-600 hover:underline"
        >
          {row.original.label}
        </Link>
      ),
    },
    {
      id: 'cbte_type',
      accessorFn: (row) => cbteTypeLabel(row.cbte_type),
      meta: { title: 'Tipo de comprobante' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de comprobante" />,
      cell: ({ row }) => <span>{cbteTypeLabel(row.original.cbte_type)}</span>,
      filterFn: (row, _id, value: string[]) => value.includes(String(row.original.cbte_type)),
    },
    {
      id: 'issue_date',
      accessorKey: 'issue_date',
      meta: { title: 'Fecha de emisión' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de emisión" />,
      cell: ({ row }) => <span>{formatDateOnly(row.original.issue_date)}</span>,
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
      id: 'supplier_cuit',
      accessorFn: (row) => row.supplier.cuit,
      meta: { title: 'CUIT del proveedor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="CUIT del proveedor" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.supplier.cuit}</span>,
    },
    {
      id: 'vat_period',
      accessorKey: 'vat_period',
      meta: { title: 'Período IVA' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Período IVA" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.vat_period}</span>,
      filterFn: (row, _id, value: string[]) => value.includes(row.original.vat_period),
    },
    {
      id: 'total',
      accessorKey: 'total',
      meta: { title: 'Total' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.total)}</span>,
    },
    {
      id: 'due_date',
      accessorKey: 'due_date',
      meta: { title: 'Vencimiento' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
      cell: ({ row }) => <span>{formatDateOnly(row.original.due_date)}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => SUPPLIER_INVOICE_STATUS_LABELS[row.status],
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <SupplierInvoiceStatusBadge status={row.original.status} />,
      filterFn: (row, _id, value: string[]) => value.includes(row.original.status),
    },
    {
      id: 'arca_check_result',
      accessorFn: (row) => arcaLabel(row.arca_check_result),
      meta: { title: 'Constatación ARCA' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Constatación ARCA" />,
      cell: ({ row }) => {
        const result = row.original.arca_check_result;
        return result ? (
          <span>{ARCA_CHECK_LABELS[result]}</span>
        ) : (
          <span className="text-muted-foreground">{NO_ARCA_CHECK_LABEL}</span>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const result = row.original.arca_check_result;
        if (result == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(result);
      },
    },
    {
      id: 'orders',
      accessorFn: (row) => row.orders.map((o) => o.number).join(', '),
      meta: { title: 'OC vinculadas' },
      // M:M (via lineas): no ordenable.
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="OC vinculadas" />,
      cell: ({ row }) =>
        row.original.orders.length === 0 ? (
          <span className="text-muted-foreground">{NO_ORDER_LABEL}</span>
        ) : (
          <div className="flex flex-wrap gap-x-2">
            {row.original.orders.map((o) => (
              <Link
                key={o.id}
                href={`/dashboard/purchases/orders/${o.id}`}
                className="font-mono text-sm text-blue-600 hover:underline"
              >
                {o.number}
              </Link>
            ))}
          </div>
        ),
      filterFn: (row, _id, value: string[]) => {
        const orders = row.original.orders;
        if (orders.length === 0) return value.includes(NULL_FILTER_VALUE);
        return orders.some((o) => value.includes(o.id));
      },
    },
    {
      id: 'creator',
      accessorFn: (row) => row.creator.name,
      meta: { title: 'Cargó' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cargó" />,
      cell: ({ row }) => <span>{row.original.creator.name}</span>,
      filterFn: (row, _id, value: string[]) => value.includes(row.original.creator.id),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha de alta' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de alta" />,
      cell: ({ row }) => (
        <span>{row.original.created_at ? moment(row.original.created_at).format('DD/MM/YYYY') : '-'}</span>
      ),
    },
  ];
}
