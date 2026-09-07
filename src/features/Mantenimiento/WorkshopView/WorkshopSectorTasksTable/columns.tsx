'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  ExternalLink,
  Hammer,
  Pause,
  PlayCircle,
  Wrench,
  XCircle,
} from 'lucide-react';
import moment from 'moment';
import { getResourceInternNumber, getResourceKindLabel, getResourceLabel } from '../../shared/maintenance-resource';
import type { WorkshopSectorTaskListItem } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'rejection_reason',
  'assigned_at',
  'created_at',
  'is_diagnostico',
  'is_critical',
  'is_rejected',
];

// ============================================================================
// ESTADOS — OM (maintenance_orders.status) y OT (work_orders.status)
// ============================================================================

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'info' | 'warning' | 'success' | 'yellow' | 'red';

type StatusConfig = {
  label: string;
  variant: BadgeVariant;
  icon: typeof AlertCircle;
};

/** Estados de maintenance_orders (String, no enum). Valores documentados en uso. */
export const MO_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending_scheduling: { label: 'Por planificar', variant: 'secondary', icon: CalendarClock },
  scheduled: { label: 'Planificada', variant: 'info', icon: CalendarClock },
  date_confirmed: { label: 'Fecha confirmada', variant: 'info', icon: CheckCircle2 },
  in_workshop: { label: 'En taller', variant: 'warning', icon: Hammer },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rechazada', variant: 'destructive', icon: XCircle },
};

/** Estados de work_orders (enum work_order_status). */
export const WO_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  in_progress: { label: 'En progreso', variant: 'info', icon: PlayCircle },
  paused: { label: 'Pausada', variant: 'yellow', icon: Pause },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle2 },
  completed_partial: { label: 'Parcial', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: Ban },
};

function getMoStatusConfig(status: string | null | undefined): StatusConfig {
  if (!status) return { label: 'Sin estado', variant: 'secondary', icon: CircleDashed };
  return MO_STATUS_CONFIG[status] ?? { label: status, variant: 'secondary', icon: CircleDashed };
}

function getWoStatusConfig(status: string | null | undefined): StatusConfig {
  if (!status) return { label: 'Sin OT', variant: 'secondary', icon: CircleDashed };
  return WO_STATUS_CONFIG[status] ?? { label: status, variant: 'secondary', icon: CircleDashed };
}

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
    // ── N° OM + Estado OM (link externo con filtro pre-aplicado) ───────────
    {
      id: 'maintenance_order',
      accessorFn: (row) => row.maintenance_orders?.order_number ?? row.maintenance_orders?.id ?? '',
      meta: { title: 'N° OM' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° OM" />,
      cell: ({ row }) => {
        const mo = row.original.maintenance_orders;
        if (!mo) return <span className="text-muted-foreground">—</span>;
        const label = mo.order_number ?? mo.id.slice(0, 8);
        const cfg = getMoStatusConfig(mo.status);
        const StatusIcon = cfg.icon;
        const href = mo.order_number
          ? `/dashboard/maintenance?tab=maint_taller&taller_step=in_workshop&maintenance-orders__order_number=${encodeURIComponent(
              mo.order_number
            )}`
          : null;
        const numberEl = href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            {label}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
          </a>
        ) : (
          <span className="font-mono text-sm font-medium text-muted-foreground">{label}</span>
        );
        return (
          <div className="flex flex-col gap-1">
            {numberEl}
            <Badge
              variant={cfg.variant}
              className="w-fit gap-1 whitespace-nowrap px-1.5 py-0 text-[10px] uppercase tracking-wide"
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {cfg.label}
            </Badge>
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.maintenance_orders?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── N° OT + Estado OT (puede ser null si el item aún no se envió a taller) ─
    {
      id: 'work_order',
      accessorFn: (row) => row.work_orders?.order_number ?? '',
      meta: { title: 'N° OT' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° OT" />,
      cell: ({ row }) => {
        const wo = row.original.work_orders;
        if (!wo) {
          return (
            <Badge variant="secondary" className="w-fit gap-1 px-1.5 py-0 text-[10px] uppercase tracking-wide">
              <CircleDashed className="h-2.5 w-2.5" />
              Sin OT
            </Badge>
          );
        }
        const label = wo.order_number ?? wo.id.slice(0, 8);
        const cfg = getWoStatusConfig(wo.status);
        const StatusIcon = cfg.icon;
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 font-mono text-sm font-medium">
              <Wrench className="h-3 w-3 opacity-60" />
              {label}
            </span>
            <Badge
              variant={cfg.variant}
              className="w-fit gap-1 whitespace-nowrap px-1.5 py-0 text-[10px] uppercase tracking-wide"
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {cfg.label}
            </Badge>
          </div>
        );
      },
    },

    // ── Vehículo (a través de maintenance_orders.vehicles) ─────────────────
    {
      id: 'vehicle',
      // Ticket 596: la tarea puede ser de un vehiculo o de un equipamiento
      accessorFn: (row) => (row.maintenance_orders ? getResourceLabel(row.maintenance_orders) : ''),
      meta: { title: 'Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const order = row.original.maintenance_orders;
        if (!order) return <span className="text-muted-foreground">—</span>;
        const internNumber = getResourceInternNumber(order);
        return (
          <div className="flex flex-col">
            <span className="font-medium">{getResourceLabel(order)}</span>
            <span className="text-xs text-muted-foreground">
              {getResourceKindLabel(order)}
              {internNumber ? ` · #${internNumber}` : ''}
            </span>
          </div>
        );
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

    // ── Columna virtual: Estado OM (para filtro facetado mo_status) ──────────
    // No visible en la tabla — la celda visual está embebida en la columna
    // `maintenance_order`. Esta columna existe únicamente para que el filtro
    // con columnId: 'mo_status' pueda vincular a table.getColumn('mo_status').
    {
      id: 'mo_status',
      accessorFn: (row) => row.maintenance_orders?.status ?? null,
      meta: { title: 'Estado OM', excludeFromExport: true },
      header: () => null,
      cell: () => null,
      enableHiding: false,
      enableSorting: false,
      filterFn: (row, _id, value: string[]) => {
        const val = row.original.maintenance_orders?.status;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Columna virtual: Estado OT (para filtro facetado wo_status) ──────────
    // No visible en la tabla — la celda visual está embebida en la columna
    // `work_order`. Esta columna existe únicamente para que el filtro
    // con columnId: 'wo_status' pueda vincular a table.getColumn('wo_status').
    {
      id: 'wo_status',
      accessorFn: (row) => row.work_orders?.status ?? null,
      meta: { title: 'Estado OT', excludeFromExport: true },
      header: () => null,
      cell: () => null,
      enableHiding: false,
      enableSorting: false,
      filterFn: (row, _id, value: string[]) => {
        const val = row.original.work_orders?.status;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },
  ];
}

// ============================================================================
// EXPORT FORMATTERS
// ============================================================================

export function getWorkshopSectorTasksExportFormatters() {
  return {
    // Estado OM (accessorFn retorna status crudo → traducir)
    mo_status: (val: unknown) => {
      if (!val) return '';
      return MO_STATUS_CONFIG[val as string]?.label ?? String(val);
    },
    // Estado OT (accessorFn retorna status crudo → traducir)
    wo_status: (val: unknown) => {
      if (!val) return 'Sin OT';
      return WO_STATUS_CONFIG[val as string]?.label ?? String(val);
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
