'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EquipmentRejectedRequest } from '@/features/Equipos/EquipoID/lib/actions/vehicle-operations-actions';
import {
  DataTableColumnHeader,
  inMemoryFacetedFilterFn,
  inMemoryTextFilterFn,
  type DataTableFacetedFilterConfig,
  type DataTableFilterOption,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CircleOff, ClipboardList, Shield, Wrench, XCircle, type LucideIcon } from 'lucide-react';
import moment from 'moment';

// ============================================================================
// LABELS & ICONS
// ============================================================================

/**
 * Origen de la solicitud. `source` no es un enum real de Prisma (es un String
 * libre en el schema), pero solo toma estos 3 valores en la práctica — mismo
 * criterio usado en `Mantenimiento/PedidosMantenimiento`.
 */
export const SOURCE_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
};

export const SOURCE_ICONS: Record<string, LucideIcon> = {
  checklist: ClipboardList,
  manual: Wrench,
  preventive: Shield,
};

export type RejectionType = 'total' | 'partial';

export const REJECTION_TYPE_LABELS: Record<RejectionType, string> = {
  total: 'Total',
  partial: 'Parcial',
};

export const REJECTION_TYPE_ICONS: Record<RejectionType, LucideIcon> = {
  total: XCircle,
  partial: AlertTriangle,
};

// Columnas secundarias — se ocultan por defecto (datos de contexto, no lo primero
// que un usuario quiere ver al abrir la sub-tab).
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['description', 'supervisor', 'preventiveType'];

// ============================================================================
// HELPERS
// ============================================================================

type RejectedItem = EquipmentRejectedRequest['maintenance_request_items'][number];

function getRejectionType(row: EquipmentRejectedRequest): RejectionType {
  return row.status === 'rejected' ? 'total' : 'partial';
}

function getItemLabel(item: RejectedItem): string {
  return (
    item.types_of_repairs?.name ?? item.checklist_deviations?.item_label ?? item.description ?? 'Ítem sin descripción'
  );
}

/** Motivo de rechazo: el de la solicitud, con fallback al del primer ítem rechazado. */
function getPrimaryReason(row: EquipmentRejectedRequest): string {
  if (row.rejection_reason) return row.rejection_reason;
  return row.maintenance_request_items?.[0]?.rejection_reason ?? '';
}

// ============================================================================
// COLUMNAS
// ============================================================================

export function getRejectedRequestsColumns(): ColumnDef<EquipmentRejectedRequest>[] {
  return [
    // ── Fecha de rechazo ─────────────────────────────────────────────────────
    {
      id: 'rejectedAt',
      accessorFn: (row) => row.rejected_at ?? row.created_at ?? null,
      meta: { title: 'Fecha de Rechazo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Rechazo" />,
      cell: ({ row }) => {
        const value = row.original.rejected_at ?? row.original.created_at;
        return <span className="text-sm">{value ? moment(value).format('DD/MM/YYYY') : '—'}</span>;
      },
    },

    // ── Tipo de rechazo (total vs parcial) ───────────────────────────────────
    {
      id: 'rejectionType',
      accessorFn: (row) => getRejectionType(row),
      meta: { title: 'Tipo de Rechazo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Rechazo" />,
      cell: ({ row }) => {
        const type = getRejectionType(row.original);
        const Icon = REJECTION_TYPE_ICONS[type];
        return (
          <Badge variant={type === 'total' ? 'destructive' : 'warning'} className="gap-1">
            <Icon className="h-3 w-3" />
            {REJECTION_TYPE_LABELS[type]}
          </Badge>
        );
      },
      filterFn: inMemoryFacetedFilterFn,
    },

    // ── Ítems rechazados ─────────────────────────────────────────────────────
    {
      id: 'items',
      accessorFn: (row) => (row.maintenance_request_items ?? []).map(getItemLabel).join(', '),
      meta: { title: 'Ítems Rechazados' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ítems Rechazados" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_request_items ?? [];

        if (items.length === 0) {
          // Rechazo total sin desglose de ítems (se rechazó la solicitud entera).
          return getRejectionType(row.original) === 'total' ? (
            <Badge variant="outline">Solicitud completa</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        }

        if (items.length === 1) {
          return <span className="text-sm">{getItemLabel(items[0])}</span>;
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-default gap-1">
                <Wrench className="h-3 w-3" />
                {items.length} ítems
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {items.map((item) => (
                  <li key={item.id}>{getItemLabel(item)}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        );
      },
      filterFn: inMemoryTextFilterFn,
    },

    // ── Motivo ───────────────────────────────────────────────────────────────
    {
      id: 'rejectionReason',
      accessorFn: (row) => getPrimaryReason(row),
      meta: { title: 'Motivo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
      cell: ({ row }) => {
        const value = getPrimaryReason(row.original);
        if (!value) return <span className="text-muted-foreground">—</span>;
        // El corte lo hace `truncate` (respeta el ancho real): cortar además a 60
        // caracteres agregaba un segundo "…" y recortaba texto que sí entraba.
        return (
          <span title={value} className="block max-w-[240px] truncate">
            {value}
          </span>
        );
      },
      filterFn: inMemoryTextFilterFn,
      enableSorting: false,
    },

    // ── Origen ───────────────────────────────────────────────────────────────
    {
      id: 'source',
      accessorFn: (row) => row.source ?? '',
      meta: { title: 'Origen' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) => {
        const src = row.original.source;
        if (!src) return <span className="text-muted-foreground">—</span>;
        const label = SOURCE_LABELS[src] ?? src;
        const Icon = SOURCE_ICONS[src];
        return (
          <Badge variant="secondary" className="gap-1">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      filterFn: inMemoryFacetedFilterFn,
    },

    // ── Rechazado por ────────────────────────────────────────────────────────
    {
      id: 'rejectedBy',
      accessorFn: (row) => row.profile_maintenance_requests_rejected_byToprofile?.fullname ?? '',
      meta: { title: 'Rechazado por' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rechazado por" />,
      cell: ({ row }) => {
        const name = row.original.profile_maintenance_requests_rejected_byToprofile?.fullname;
        return name ? (
          <span className="text-sm">{name}</span>
        ) : (
          <span className="text-muted-foreground">Sin asignar</span>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string;
        if (!val) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Descripción de la solicitud (oculta por defecto) ────────────────────
    {
      id: 'description',
      accessorFn: (row) => row.description ?? '',
      meta: { title: 'Descripción' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => {
        const value = row.original.description ?? '';
        if (!value) return <span className="text-muted-foreground">—</span>;
        return (
          <span title={value} className="block max-w-[240px] truncate">
            {value}
          </span>
        );
      },
      filterFn: inMemoryTextFilterFn,
      enableSorting: false,
    },

    // ── Supervisor (oculta por defecto) ─────────────────────────────────────
    {
      id: 'supervisor',
      accessorFn: (row) => row.profile_maintenance_requests_supervisor_idToprofile?.fullname ?? '',
      meta: { title: 'Supervisor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Supervisor" />,
      cell: ({ row }) => {
        const name = row.original.profile_maintenance_requests_supervisor_idToprofile?.fullname;
        return name ? <span className="text-sm">{name}</span> : <span className="text-muted-foreground">—</span>;
      },
      filterFn: inMemoryTextFilterFn,
    },

    // ── Tipo preventivo (oculta por defecto, solo aplica a source=preventive) ─
    {
      id: 'preventiveType',
      accessorFn: (row) => row.preventive_type ?? '',
      meta: { title: 'Tipo Preventivo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Preventivo" />,
      cell: ({ row }) => <span className="text-sm">{row.original.preventive_type || '—'}</span>,
      filterFn: inMemoryTextFilterFn,
    },
  ];
}

/** Opciones fijas del filtro "Tipo de Rechazo" — solo 2 valores posibles. */
export function buildRejectionTypeFilter(): DataTableFacetedFilterConfig {
  return {
    columnId: 'rejectionType',
    title: 'Tipo de Rechazo',
    type: 'faceted',
    options: (Object.keys(REJECTION_TYPE_LABELS) as RejectionType[]).map((value) => ({
      value,
      label: REJECTION_TYPE_LABELS[value],
      icon: REJECTION_TYPE_ICONS[value],
    })),
  };
}

/** Opciones fijas del filtro "Origen" — `source` solo toma estos 3 valores en la práctica. */
export function buildSourceFilter(): DataTableFacetedFilterConfig {
  return {
    columnId: 'source',
    title: 'Origen',
    type: 'faceted',
    options: Object.keys(SOURCE_LABELS).map((value) => ({
      value,
      label: SOURCE_LABELS[value],
      icon: SOURCE_ICONS[value],
    })),
  };
}

/** Opciones del filtro "Rechazado por" — computadas desde el dataset en memoria (data chica por equipo). */
export function buildRejectedByFilter(data: EquipmentRejectedRequest[]): DataTableFacetedFilterConfig {
  const names = new Set<string>();
  let hasUnassigned = false;

  data.forEach((row) => {
    const name = row.profile_maintenance_requests_rejected_byToprofile?.fullname;
    if (name) {
      names.add(name);
    } else {
      hasUnassigned = true;
    }
  });

  const options: DataTableFilterOption[] = Array.from(names)
    .sort()
    .map((name) => ({ value: name, label: name }));

  if (hasUnassigned) {
    options.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff });
  }

  return {
    columnId: 'rejectedBy',
    title: 'Rechazado por',
    type: 'faceted',
    options,
  };
}
