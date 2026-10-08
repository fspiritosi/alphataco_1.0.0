'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, CheckCircle2, Clock, FileX, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { SupplierListItem } from './actions.server';
import { SUPPLIER_DOCUMENT_STATE_LABELS, type SupplierDocumentState } from './labels';

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['created_at'];

/** Icono por estado de documentacion: lo comparten la celda y el filtro. */
export const supplierDocumentStateIcons: Record<SupplierDocumentState, LucideIcon> = {
  EXPIRED: AlertCircle,
  EXPIRING: Clock,
  OK: CheckCircle2,
  NONE: FileX,
};

const DOCUMENT_STATE_CLASSES: Record<SupplierDocumentState, string> = {
  EXPIRED: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  EXPIRING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  OK: 'bg-green-600 text-white hover:bg-green-600/90',
  NONE: 'text-muted-foreground',
};

export function getColumns(): ColumnDef<SupplierListItem>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      meta: { title: 'Razón social' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Razón social" />,
      cell: ({ row }) => (
        <div className={cn('flex flex-col', !row.original.is_active && 'opacity-50')}>
          <Link
            href={`/dashboard/purchases/suppliers/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.original.name}
          </Link>
          {row.original.trade_name && <span className="text-xs text-muted-foreground">{row.original.trade_name}</span>}
        </div>
      ),
    },
    {
      id: 'cuit',
      accessorKey: 'cuit',
      meta: { title: 'CUIT' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="CUIT" />,
      cell: ({ row }) => (
        <span className={cn('font-mono text-sm tabular-nums', !row.original.is_active && 'opacity-50')}>
          {row.original.cuit}
        </span>
      ),
    },
    {
      id: 'vat_condition',
      accessorFn: (row) => row.vat_condition,
      meta: { title: 'Condición de IVA' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición de IVA" />,
      cell: ({ row }) => <span>{row.original.vat_condition}</span>,
      filterFn: (row, _id, value: string[]) => value.includes(String(row.original.vat_condition_id)),
    },
    {
      id: 'categories',
      accessorFn: (row) => row.categories.map((c) => c.name).join(', '),
      meta: { title: 'Rubros' },
      // M:M: no ordenable
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rubros" />,
      cell: ({ row }) =>
        row.original.categories.length === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.categories.map((c) => (
              <Badge key={c.id} variant="outline">
                {c.name}
              </Badge>
            ))}
          </div>
        ),
      filterFn: (row, _id, value: string[]) => {
        const items = row.original.categories;
        if (items.length === 0) return value.includes(NULL_FILTER_VALUE);
        return items.some((c) => value.includes(c.id));
      },
    },
    {
      id: 'contact',
      accessorFn: (row) =>
        row.contact ? [row.contact.name, row.contact.email ?? row.contact.phone].filter(Boolean).join(' · ') : '',
      meta: { title: 'Contacto principal' },
      // Sale de una relacion 1:N (el principal): no ordenable.
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contacto principal" />,
      cell: ({ row }) => {
        const c = row.original.contact;
        if (!c) return <span className="text-muted-foreground">-</span>;
        const via = c.email ?? c.phone;
        return (
          <span>
            {c.name}
            {via && <span className="text-muted-foreground"> · {via}</span>}
          </span>
        );
      },
    },
    {
      id: 'documents',
      accessorFn: (row) => SUPPLIER_DOCUMENT_STATE_LABELS[row.documents.state],
      meta: { title: 'Documentos' },
      // Estado derivado de los documentos vigentes (no es un campo de la base): no ordenable.
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documentos" />,
      cell: ({ row }) => {
        const { state, nextExpiry } = row.original.documents;
        const Icon = supplierDocumentStateIcons[state];
        return (
          <Badge
            variant={state === 'NONE' ? 'outline' : 'default'}
            className={cn('gap-1', DOCUMENT_STATE_CLASSES[state])}
            title={nextExpiry ? `Próximo vencimiento: ${moment.utc(nextExpiry).format('DD/MM/YYYY')}` : undefined}
          >
            <Icon className="h-3 w-3" />
            {SUPPLIER_DOCUMENT_STATE_LABELS[state]}
          </Badge>
        );
      },
      filterFn: (row, _id, value: string[]) => value.includes(row.original.documents.state),
    },
    {
      id: 'is_active',
      accessorFn: (row) => (row.is_active ? 'Activo' : 'Inactivo'),
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600/90">
            <CheckCircle2 className="h-3 w-3" />
            Activo
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Inactivo
          </Badge>
        ),
      filterFn: (row, _id, value: string[]) => value.includes(String(row.original.is_active)),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha de alta' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de alta" />,
      cell: ({ row }) => <span>{moment(row.original.created_at).format('DD/MM/YYYY')}</span>,
    },
  ];
}
