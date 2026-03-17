'use client';

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SimpleDocument from '@/features/Documentacion/shared/components/SimpleDocument';
import { PermissionGuard } from '@/features/Permissions';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, CheckCircle2, Clock, FileText, HelpCircle, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useState } from 'react';
import type { MonthlyEmployeeDocumentListItem } from './actions.server';

// ============================================================================
// COLUMN DEFAULTS
// ============================================================================

/** Columnas ocultas por defecto (visibles al hacer toggle) */
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['mandatory', 'multiresource', 'deny_reason'];

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
// BADGE VARIANTS — Estado
// ============================================================================

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

const stateBadgeVariants: Record<string, BadgeVariant> = {
  presentado: 'default',
  aprobado: 'success',
  rechazado: 'destructive',
  vencido: 'yellow',
  pendiente: 'destructive',
};

// ============================================================================
// STATE LABELS
// ============================================================================

export const stateLabels: Record<string, string> = {
  presentado: 'Presentado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
  pendiente: 'Pendiente',
};

// ============================================================================
// COLUMNS
// ============================================================================

export const columns: ColumnDef<MonthlyEmployeeDocumentListItem>[] = [
  // ─── Empleado ────────────────────────────────────────────────────────────
  {
    id: 'employee',
    accessorFn: (row) => (row.employees ? `${row.employees.lastname} ${row.employees.firstname}` : ''),
    meta: { title: 'Empleado' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row }) => {
      const employee = row.original.employees;
      if (!employee) return <span className="text-muted-foreground">-</span>;
      return (
        <Link
          href={`/dashboard/employee/action?action=view&employee_id=${employee.id}`}
          className="hover:underline font-medium"
          target="_blank"
        >
          {employee.lastname} {employee.firstname}
        </Link>
      );
    },
    enableSorting: true,
  },

  // ─── Legajo ───────────────────────────────────────────────────────────────
  {
    id: 'fileNumber',
    accessorFn: (row) => row.employees?.file ?? '',
    meta: { title: 'Legajo' },
    header: ({ column }) => (
      <div className="flex items-center gap-1">
        <DataTableColumnHeader column={column} title="Legajo" />
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Coincidencia exacta: ingrese el legajo completo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    ),
    cell: ({ row }) => {
      const file = row.original.employees?.file;
      if (!file) return <span className="text-muted-foreground">-</span>;
      return <span className="font-mono text-sm">{file}</span>;
    },
    enableSorting: false,
  },

  // ─── Tipo de Documento ────────────────────────────────────────────────────
  {
    id: 'documentType',
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

  // ─── Afectado a ──────────────────────────────────────────────────────────
  {
    id: 'contractor',
    accessorFn: (row) =>
      row.employees?.contractor_employee
        ?.map((ce) => ce.customers?.name ?? '')
        .filter(Boolean)
        .join(', ') ?? '',
    meta: { title: 'Afectado a' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Afectado a" />,
    cell: ({ row }) => {
      const contractors =
        row.original.employees?.contractor_employee?.map((ce) => ce.customers?.name ?? '').filter(Boolean) ?? [];

      if (contractors.length === 0) return <Badge variant="outline">Sin afectar</Badge>;

      const [first, ...rest] = contractors;
      if (rest.length === 0) return <Badge>{first}</Badge>;

      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="cursor-pointer">
                {first} +{rest.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white rounded-lg p-2">
              <div className="flex flex-col gap-1">
                {contractors.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    filterFn: (row, _id, value: string[]) => {
      const contractors = row.original.employees?.contractor_employee ?? [];
      if (contractors.length === 0) return value.includes(NULL_FILTER_VALUE);
      return contractors.some((ce) => ce.customers?.id && value.includes(ce.customers.id));
    },
    enableSorting: false,
  },

  // ─── Estado ──────────────────────────────────────────────────────────────
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

  // ─── Mandatorio ──────────────────────────────────────────────────────────
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

  // ─── Multirecurso ────────────────────────────────────────────────────────
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

  // ─── Período ─────────────────────────────────────────────────────────────
  {
    id: 'period',
    accessorKey: 'period',
    meta: { title: 'Período' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Período" />,
    cell: ({ row }) => <span>{row.original.period ?? '-'}</span>,
    enableSorting: true,
  },

  // ─── Subido el ───────────────────────────────────────────────────────────
  {
    id: 'created_at',
    accessorKey: 'created_at',
    meta: { title: 'Subido el' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subido el" />,
    cell: ({ row }) => {
      const isPending = row.original.state === 'pendiente';
      if (isPending) return <span className="text-muted-foreground">No disponible</span>;

      // Usar el log más reciente si existe, sino created_at
      const latestLog = row.original.documents_employees_logs?.[0];
      const date = latestLog?.updated_at ?? row.original.created_at;
      return <span>{moment(date).format('DD/MM/YYYY')}</span>;
    },
    enableSorting: true,
  },

  // ─── Razón de rechazo ─────────────────────────────────────────────────────
  {
    id: 'deny_reason',
    accessorKey: 'deny_reason',
    meta: { title: 'Razón de rechazo' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Razón de rechazo" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.deny_reason ?? '-'}</span>,
    enableSorting: false,
  },

  // ─── Acciones ─────────────────────────────────────────────────────────────
  {
    id: 'actions',
    meta: { title: '', excludeFromExport: true },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  },
];

// ============================================================================
// ACTIONS CELL
// ============================================================================

function ActionsCell({ row }: { row: MonthlyEmployeeDocumentListItem }) {
  const isPending = row.state === 'pendiente';
  const [open, setOpen] = useState(false);

  if (isPending) {
    return (
      <PermissionGuard module="documentacion" tab="docs-empleados-mensuales" action="update">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Subir documento
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="max-h-[90vh] overflow-y-auto">
                <SimpleDocument
                  resource="empleado"
                  handleOpen={() => setOpen(false)}
                  defaultDocumentId={row.id_document_types ?? undefined}
                  numberDocument={row.employees?.document_number ?? undefined}
                />
              </div>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard module="documentacion" tab="docs-empleados-mensuales" action="view">
      <Link href={`/dashboard/document/${row.id}?resource=${row.employees ? 'Persona' : 'Equipos'}`}>
        <Button size="sm">Ver documento</Button>
      </Link>
    </PermissionGuard>
  );
}
