'use client';

import SimpleDocument from '@/components/SimpleDocument';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useState } from 'react';
import type { EmployeePermanentDocumentListItem } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['deny_reason', 'multiresource'];

// ============================================================================
// ICONS — Estado
// ============================================================================

export const stateIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  presentado: FileText,
  aprobado: CheckCircle2,
  rechazado: XCircle,
  vencido: AlertCircle,
  pendiente: Clock,
};

// ============================================================================
// STATE BADGE CONFIG
// ============================================================================

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

const stateBadgeVariants: Record<string, BadgeVariant> = {
  vencido: 'yellow',
  rechazado: 'destructive',
  pendiente: 'destructive',
  aprobado: 'success',
  presentado: 'default',
};

export const stateLabels: Record<string, string> = {
  presentado: 'Presentado',
  rechazado: 'Rechazado',
  aprobado: 'Aprobado',
  vencido: 'Vencido',
  pendiente: 'Pendiente',
};

// ============================================================================
// ACTIONS CELL — must be a separate component (uses hooks)
// ============================================================================

function ActionsCell({ row }: { row: { original: EmployeePermanentDocumentListItem } }) {
  const [open, setOpen] = useState(false);
  const isNoPresented = row.original.state === 'pendiente';

  if (isNoPresented) {
    return (
      <PermissionGuard module="documentacion" tab="docs-empleados-permanentes" action="update">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Subir documento
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="max-h-[90vh] overflow-y-auto">
                <div className="space-y-3">
                  <div>
                    <SimpleDocument
                      resource="empleado"
                      handleOpen={() => setOpen(false)}
                      defaultDocumentId={row.original.id_document_types!}
                      numberDocument={row.original.employees?.document_number}
                    />
                  </div>
                </div>
              </div>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard module="documentacion" tab="docs-empleados-permanentes" action="view">
      <Link href={`/dashboard/document/${row.original.id}?resource=Persona`}>
        <Button size="sm">Ver documento</Button>
      </Link>
    </PermissionGuard>
  );
}

// ============================================================================
// COLUMNS DEFINITION
// ============================================================================

export const columns: ColumnDef<EmployeePermanentDocumentListItem>[] = [
  // ─── Empleado ─────────────────────────────────────────────────────────────
  {
    id: 'employee',
    accessorFn: (row) => (row.employees ? `${row.employees.lastname} ${row.employees.firstname}` : ''),
    meta: { title: 'Empleado' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row }) => {
      const emp = row.original.employees;
      if (!emp) return <span className="text-muted-foreground">-</span>;
      return (
        <Link
          href={`/dashboard/employee/action?action=view&employee_id=${emp.id}`}
          className="hover:underline font-medium"
          target="_blank"
        >
          [{emp.file}] {emp.lastname} {emp.firstname}
        </Link>
      );
    },
    filterFn: (row, _id, value: string[]) => {
      const id = row.original.applies;
      if (id == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(id);
    },
    enableSorting: true,
  },

  // ─── Tipo de Documento ────────────────────────────────────────────────────
  {
    id: 'document_type',
    accessorFn: (row) => row.document_types?.name ?? '',
    meta: { title: 'Tipo de Documento' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
    cell: ({ row }) => <span className="font-medium">{row.original.document_types?.name ?? '-'}</span>,
    filterFn: (row, _id, value: string[]) => {
      const id = row.original.id_document_types;
      if (id == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(id);
    },
    enableSorting: true,
  },

  // ─── Estado ───────────────────────────────────────────────────────────────
  {
    id: 'state',
    accessorKey: 'state',
    meta: { title: 'Estado' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const state = row.original.state as string | null;
      if (!state) return <Badge variant="outline">Sin estado</Badge>;

      const Icon = stateIcons[state];
      const variant = stateBadgeVariants[state] ?? 'default';
      const label = stateLabels[state] ?? state;

      return (
        <Badge variant={variant} className="capitalize flex items-center gap-1 w-fit">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => {
      const val = row.getValue(id) as string | null;
      if (val == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(val);
    },
    enableSorting: true,
  },

  // ─── Mandatorio ───────────────────────────────────────────────────────────
  {
    id: 'mandatory',
    accessorFn: (row) => (row.document_types?.mandatory != null ? String(row.document_types.mandatory) : null),
    meta: { title: 'Mandatorio' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mandatorio" />,
    cell: ({ row }) => {
      const val = row.original.document_types?.mandatory;
      if (val == null) return <span className="text-muted-foreground">-</span>;
      return <span>{val ? 'Sí' : 'No'}</span>;
    },
    filterFn: (row, _id, value: string[]) => {
      const val = row.original.document_types?.mandatory;
      if (val == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(String(val));
    },
    enableSorting: false,
  },

  // ─── Multirecurso ─────────────────────────────────────────────────────────
  {
    id: 'multiresource',
    accessorFn: (row) => (row.document_types?.multiresource != null ? String(row.document_types.multiresource) : null),
    meta: { title: 'Multirecurso' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Multirecurso" />,
    cell: ({ row }) => {
      const val = row.original.document_types?.multiresource;
      if (val == null) return <span className="text-muted-foreground">-</span>;
      return <span>{val ? 'Sí' : 'No'}</span>;
    },
    filterFn: (row, _id, value: string[]) => {
      const val = row.original.document_types?.multiresource;
      if (val == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(String(val));
    },
    enableSorting: false,
  },

  // ─── Vencimiento ──────────────────────────────────────────────────────────
  {
    id: 'validity',
    accessorKey: 'validity',
    meta: { title: 'Vencimiento' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => {
      const hasExpiration = row.original.document_types?.explired;
      if (!hasExpiration) {
        return <Badge variant="outline">No vence</Badge>;
      }

      if (row.original.state === 'pendiente') {
        return <Badge variant="destructive">Pendiente</Badge>;
      }

      if (row.original.validity) {
        return <span>{moment(row.original.validity).format('DD/MM/YYYY')}</span>;
      }

      return <Badge variant="outline">No vence</Badge>;
    },
    enableSorting: true,
  },

  // ─── Subido el ────────────────────────────────────────────────────────────
  {
    id: 'created_at',
    accessorKey: 'created_at',
    meta: { title: 'Subido el' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subido el" />,
    cell: ({ row }) => {
      if (row.original.state === 'pendiente') {
        return <span className="text-muted-foreground">No disponible</span>;
      }
      return <span>{moment(row.original.created_at).format('DD/MM/YYYY')}</span>;
    },
    enableSorting: true,
  },

  // ─── Motivo de rechazo ────────────────────────────────────────────────────
  {
    id: 'deny_reason',
    accessorKey: 'deny_reason',
    meta: { title: 'Motivo de rechazo' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo de rechazo" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.deny_reason ?? '-'}</span>,
    enableSorting: false,
  },

  // ─── Acciones ─────────────────────────────────────────────────────────────
  {
    id: 'actions',
    meta: { excludeFromExport: true, title: '' },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
