'use client';

import { Badge } from '@/components/ui/badge';
import AddCompanyDocumentForm from '@/features/Empresa/General/Documentacion/components/AddCompanyDocumentForm';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { documentStateBadges, documentStateLabels } from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Clock, ExternalLink, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { CompanyDocListItem } from '../actions.server';

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [];

// ============================================================================
// STATE ICONS (exported for use in filters)
// ============================================================================

export const documentStateIcons: Record<string, LucideIcon> = {
  presentado: ExternalLink,
  rechazado: XCircle,
  aprobado: CheckCircle2,
  vencido: AlertCircle,
  pendiente: Clock,
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

/**
 * Retorna las columnas de la tabla de documentos de empresa.
 * El parámetro `isMonthly` controla si se muestra la columna "Período".
 */
export function getCompanyDocsColumns(isMonthly: boolean): ColumnDef<CompanyDocListItem>[] {
  const periodColumn: ColumnDef<CompanyDocListItem> = {
    id: 'period',
    accessorKey: 'period',
    meta: { title: 'Período' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Período" />,
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.period ?? '-'}</span>,
    enableSorting: true,
  };

  return [
    // ── Nombre del documento (FK → document_types.name) ───────────────────
    {
      id: 'documentType',
      accessorFn: (row) => row.document_types?.name ?? '',
      meta: { title: 'Nombre del documento' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre del documento" />,
      cell: ({ row }) => <span className="font-medium">{row.original.document_types?.name ?? '-'}</span>,
      enableSorting: true,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.document_types?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Estado (enum state) ────────────────────────────────────────────────
    {
      id: 'state',
      accessorKey: 'state',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const stateValue = row.original.state as string;
        const label = documentStateLabels[stateValue] ?? stateValue;
        const variant = documentStateBadges[stateValue] ?? 'default';
        const Icon = documentStateIcons[stateValue];
        return (
          <Badge variant={variant} className="flex items-center gap-1 w-fit">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Mandatorio (document_types.mandatory) ─────────────────────────────
    {
      id: 'mandatory',
      accessorFn: (row) => row.document_types?.mandatory,
      meta: { title: 'Mandatorio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mandatorio" />,
      cell: ({ row }) => {
        const mandatory = row.original.document_types?.mandatory;
        return <Badge variant={mandatory ? 'destructive' : 'secondary'}>{mandatory ? 'Sí' : 'No'}</Badge>;
      },
      enableSorting: false,
      filterFn: (row, _id, value: string[]) => {
        const mandatory = row.original.document_types?.mandatory;
        return value.includes(String(mandatory ?? false));
      },
    },

    // ── Subido por (FK → profile.fullname, via user_id) ──────────────────
    {
      id: 'uploadedBy',
      accessorFn: (row) => row.profile?.fullname ?? '',
      meta: { title: 'Subido por' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subido por" />,
      cell: ({ row }) => {
        const fullname = row.original.profile?.fullname;
        return <span className="text-sm">{fullname ?? <span className="text-muted-foreground">Pendiente</span>}</span>;
      },
      enableSorting: true,
      filterFn: (row, _id, value: string[]) => {
        const userId = row.original.user_id;
        if (userId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(userId);
      },
    },

    // ── Fecha de carga (created_at) ────────────────────────────────────────
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha de carga' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de carga" />,
      cell: ({ row }) => {
        const date = row.original.created_at;
        return <span className="text-sm tabular-nums">{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
      enableSorting: true,
    },

    // ── Vencimiento (validity / document_types.explired) ──────────────────
    {
      id: 'validity',
      accessorKey: 'validity',
      meta: { title: 'Vencimiento' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
      cell: ({ row }) => {
        const validity = row.original.validity;
        const explired = row.original.document_types?.explired;

        if (validity) {
          return <span className="text-sm tabular-nums">{validity}</span>;
        }
        if (!explired) {
          return <span className="text-muted-foreground text-sm">No vence</span>;
        }
        return <span className="text-muted-foreground text-sm">Pendiente</span>;
      },
      enableSorting: true,
    },

    // ── Período (SOLO para Mensuales) ─────────────────────────────────────
    ...(isMonthly ? [periodColumn] : []),

    // ── Acciones ───────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      header: () => null,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const doc = row.original;
        const isUploaded = doc.state !== 'pendiente' || !!doc.document_path;

        if (isUploaded) {
          return (
            <Link
              href={`/dashboard/document/${doc.id}?resource=Empresa`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver
            </Link>
          );
        }

        return (
          <AddCompanyDocumentForm
            documentId={doc.id_document_types ?? ''}
            redirectId={doc.id}
            documentIsUploaded={false}
            documentTypeName={doc.document_types?.name}
            documentTypeExplired={doc.document_types?.explired}
            documentTypeMontlhy={doc.document_types?.is_it_montlhy ?? undefined}
          />
        );
      },
    },
  ];
}
