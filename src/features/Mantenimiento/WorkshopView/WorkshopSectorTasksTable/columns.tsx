'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { WorkshopSectorTaskListItem } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['rejection_reason', 'assigned_at', 'created_at', 'is_diagnostico'];

// ============================================================================
// TASK STATUS — derivado de flags (no existe campo único de estado en BD)
// ============================================================================

type TaskStatus = 'rejected' | 'critical' | 'pending' | 'normal';

function getTaskStatus(row: WorkshopSectorTaskListItem): TaskStatus {
  if (row.is_rejected) return 'rejected';
  if (row.is_critical) return 'critical';
  return 'normal';
}

type TaskStatusConfig = {
  label: string;
  variant: 'destructive' | 'yellow' | 'secondary' | 'default';
  icon: typeof AlertCircle;
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  rejected: { label: 'Rechazada', variant: 'destructive', icon: XCircle },
  critical: { label: 'Crítica', variant: 'yellow', icon: AlertTriangle },
  normal: { label: 'Normal', variant: 'default', icon: CheckCircle2 },
  pending: { label: 'Pendiente', variant: 'secondary', icon: AlertCircle },
};

// Exportamos los labels/icons para uso en los filtros del DataTable
export const IS_CRITICAL_LABELS: Record<string, string> = {
  true: 'Crítica',
  false: 'Normal',
};

export const IS_REJECTED_LABELS: Record<string, string> = {
  true: 'Rechazada',
  false: 'No rechazada',
};

// ============================================================================
// COLUMNS
// ============================================================================

export function getWorkshopSectorTasksColumns(): ColumnDef<WorkshopSectorTaskListItem>[] {
  return [
    // ── Estado derivado (is_critical + is_rejected → badge visual) ────────
    {
      id: 'task_status',
      accessorFn: (row) => {
        if (row.is_rejected) return 'rejected';
        if (row.is_critical) return 'critical';
        return 'normal';
      },
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = getTaskStatus(row.original);
        const config = TASK_STATUS_CONFIG[status];
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="gap-1 whitespace-nowrap">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
      // Sin filterFn — los filtros is_critical e is_rejected son columnas separadas
      enableSorting: false,
    },

    // ── N° Orden (FK → maintenance_orders, con link al detalle) ────────────
    {
      id: 'maintenance_order',
      accessorFn: (row) => row.maintenance_orders?.order_number ?? row.maintenance_orders?.id ?? '',
      meta: { title: 'N° Orden' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
      cell: ({ row }) => {
        const mo = row.original.maintenance_orders;
        if (!mo) return <span className="text-muted-foreground">—</span>;
        const label = mo.order_number ?? mo.id.slice(0, 8);
        return (
          <Link
            href={`/dashboard/maintenance/${mo.id}`}
            className="flex items-center gap-1 text-primary underline-offset-2 hover:underline"
            target="_blank"
          >
            {label}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </Link>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.maintenance_orders?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Vehículo (a través de maintenance_orders.vehicles) ─────────────────
    {
      id: 'vehicle',
      accessorFn: (row) => {
        const v = row.maintenance_orders?.vehicles;
        if (!v) return '';
        return [v.domain, v.serie, v.intern_number ? `(${v.intern_number})` : ''].filter(Boolean).join(' ');
      },
      meta: { title: 'Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const v = row.original.maintenance_orders?.vehicles;
        if (!v) return <span className="text-muted-foreground">—</span>;
        const label = [v.domain, v.serie, v.intern_number ? `(${v.intern_number})` : ''].filter(Boolean).join(' ');
        return <span className="font-medium">{label}</span>;
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.maintenance_orders?.vehicles?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      enableSorting: false, // no existe FK_SORT_MAP para este nivel de anidamiento
    },

    // ── Descripción de la tarea (texto) ────────────────────────────────────
    {
      accessorKey: 'description',
      meta: { title: 'Descripción' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs text-sm">
          {row.original.description ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },

    // ── Tipo de reparación (FK nullable → types_of_repairs) ────────────────
    {
      id: 'repair_type',
      accessorFn: (row) => row.types_of_repairs?.name ?? '',
      meta: { title: 'Tipo de Reparación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Reparación" />,
      cell: ({ row }) => (
        <span>{row.original.types_of_repairs?.name ?? <span className="text-muted-foreground">—</span>}</span>
      ),
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.types_of_repairs?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Fecha inicio planificada ────────────────────────────────────────────
    {
      accessorKey: 'planned_start_date',
      meta: { title: 'Inicio Plan.' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Inicio Plan." />,
      cell: ({ row }) => (
        <span>
          {row.original.planned_start_date ? (
            moment(row.original.planned_start_date).format('DD/MM/YYYY')
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },

    // ── Fecha fin planificada ───────────────────────────────────────────────
    {
      accessorKey: 'planned_end_date',
      meta: { title: 'Fin Plan.' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fin Plan." />,
      cell: ({ row }) => (
        <span>
          {row.original.planned_end_date ? (
            moment(row.original.planned_end_date).format('DD/MM/YYYY')
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },

    // ── is_critical (booleano) — columna oculta, para filtro ───────────────
    {
      accessorKey: 'is_critical',
      meta: { title: 'Crítica' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Crítica" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_critical ? 'yellow' : 'secondary'} className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {row.original.is_critical ? 'Sí' : 'No'}
        </Badge>
      ),
      filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    },

    // ── is_rejected (booleano) — columna oculta, para filtro ───────────────
    {
      accessorKey: 'is_rejected',
      meta: { title: 'Rechazada' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rechazada" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_rejected ? 'destructive' : 'secondary'} className="gap-1">
          {row.original.is_rejected ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {row.original.is_rejected ? 'Sí' : 'No'}
        </Badge>
      ),
      filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    },

    // ── Fecha de asignación (oculta por defecto) ────────────────────────────
    {
      accessorKey: 'assigned_at',
      meta: { title: 'Asignada el' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Asignada el" />,
      cell: ({ row }) => (
        <span>
          {row.original.assigned_at ? (
            moment(row.original.assigned_at).format('DD/MM/YYYY')
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },

    // ── Motivo de rechazo (oculto por defecto) ──────────────────────────────
    {
      accessorKey: 'rejection_reason',
      meta: { title: 'Motivo Rechazo' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo Rechazo" />,
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">
          {row.original.rejection_reason ?? '—'}
        </span>
      ),
    },

    // ── Es diagnóstico (oculto por defecto) ────────────────────────────────
    {
      accessorKey: 'is_diagnostico',
      meta: { title: 'Diagnóstico' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Diagnóstico" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_diagnostico ? 'info' : 'secondary'}>
          {row.original.is_diagnostico ? 'Sí' : 'No'}
        </Badge>
      ),
      filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    },

    // ── Fecha de creación (oculta por defecto) ──────────────────────────────
    {
      accessorKey: 'created_at',
      meta: { title: 'Creada el' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creada el" />,
      cell: ({ row }) => (
        <span>
          {row.original.created_at ? (
            moment(row.original.created_at).format('DD/MM/YYYY')
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
  ];
}

// ============================================================================
// EXPORT FORMATTERS
// ============================================================================

export function getWorkshopSectorTasksExportFormatters() {
  return {
    // Estado derivado (virtual)
    task_status: (val: unknown) => {
      const config = TASK_STATUS_CONFIG[val as TaskStatus];
      return config?.label ?? String(val ?? '');
    },
    // Booleanos
    is_critical: (val: unknown) => (val ? 'Sí' : 'No'),
    is_rejected: (val: unknown) => (val ? 'Sí' : 'No'),
    is_diagnostico: (val: unknown) => (val ? 'Sí' : 'No'),
    // Fechas
    planned_start_date: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
    planned_end_date: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
    assigned_at: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
    created_at: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY HH:mm') : ''),
    // El estado derivado (task_status) usa accessorFn → se exporta como string sin formatter
    // FK con accessorFn (repair_type, maintenance_order, vehicle) → ya retornan .name/.label, sin formatter
  };
}
