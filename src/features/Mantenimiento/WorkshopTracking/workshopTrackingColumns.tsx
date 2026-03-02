'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleOff,
  Clock,
  Eye,
  Play,
  XCircle,
} from 'lucide-react';
import moment from 'moment';
import type { WorkshopTrackingListItem } from './actions.server';

// ============================================================================
// STATUS CONFIG
// ============================================================================

type StatusConfig = {
  label: string;
  variant: 'default' | 'info' | 'yellow' | 'success' | 'secondary' | 'destructive';
  icon: LucideIcon;
};

export const WORKSHOP_STATUS_CONFIG: Record<string, StatusConfig> = {
  in_workshop: { label: 'En Taller', variant: 'info', icon: Play },
  pending_workshop_validation: { label: 'Pend. Validación Taller', variant: 'yellow', icon: Clock },
  pending_operations_validation: { label: 'Pend. Validación Operaciones', variant: 'yellow', icon: Clock },
  operations_rejected: { label: 'Rechazada por Ops', variant: 'destructive', icon: XCircle },
  workshop_rejected: { label: 'Rechazada por Taller', variant: 'destructive', icon: XCircle },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle2 },
};

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['created_at'];

// ============================================================================
// HELPER: Sector status from work orders
// ============================================================================

type MaintenanceOrderItem = WorkshopTrackingListItem['maintenance_order_items'][number];

function getSectorStatus(sectorItems: MaintenanceOrderItem[]): 'completed' | 'in_progress' | 'pending' {
  const repairs = sectorItems.flatMap((item) => {
    const wo = item.work_orders;
    if (!wo) return [];
    const woi = wo.work_order_items ?? [];
    return woi
      .filter((w) => w.maintenance_order_item_id === item.id)
      .flatMap((w) => w.work_order_item_repairs ?? []);
  });

  if (repairs.length === 0) return 'pending';
  const completed = repairs.filter((r) => r.status === 'completed').length;
  if (completed === repairs.length) return 'completed';
  if (completed > 0 || repairs.some((r) => r.status === 'in_progress')) return 'in_progress';
  return 'pending';
}

// ============================================================================
// COLUMNS
// ============================================================================

interface ColumnsProps {
  onViewDetail: (order: WorkshopTrackingListItem) => void;
}

export function getWorkshopTrackingColumns({ onViewDetail }: ColumnsProps): ColumnDef<WorkshopTrackingListItem>[] {
  return [
    // ── N° Orden ─────────────────────────────────────────────────────────────
    {
      accessorKey: 'order_number',
      id: 'order_number',
      meta: { title: 'N° Orden' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.order_number || '-'}</span>
      ),
    },

    // ── Equipo (FK → vehicles) ────────────────────────────────────────────────
    {
      id: 'vehicle',
      meta: { title: 'Equipo' },
      accessorFn: (row) => {
        const v = row.vehicles;
        return v?.domain || v?.serie || '';
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        if (!vehicle) return <span className="text-muted-foreground">-</span>;
        return (
          <div>
            <span className="font-medium">{vehicle.domain || vehicle.serie || '-'}</span>
            {vehicle.intern_number && (
              <span className="text-muted-foreground ml-1 text-xs">({vehicle.intern_number})</span>
            )}
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const vehicleId = row.original.vehicles?.id;
        if (vehicleId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(vehicleId);
      },
      enableSorting: true,
    },

    // ── Ingreso a Taller ─────────────────────────────────────────────────────
    {
      accessorKey: 'workshop_entry_date',
      id: 'workshop_entry_date',
      meta: { title: 'Ingreso' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ingreso" />,
      cell: ({ row }) => {
        const date = row.original.workshop_entry_date;
        return <span>{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
    },

    // ── Días en Taller (virtual — calculado) ─────────────────────────────────
    {
      id: 'days_in_workshop',
      meta: { title: 'Días en Taller' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Días en Taller" />,
      cell: ({ row }) => {
        const date = row.original.workshop_entry_date;
        if (!date) return <span className="text-muted-foreground">-</span>;
        const days = moment().diff(moment(date), 'days');
        const variant: 'destructive' | 'warning' | 'secondary' =
          days > 7 ? 'destructive' : days > 3 ? 'warning' : 'secondary';
        return (
          <Badge variant={variant}>
            {days} {days === 1 ? 'día' : 'días'}
          </Badge>
        );
      },
      enableSorting: false,
    },

    // ── Recorrido Sectores (virtual — calculado) ──────────────────────────────
    {
      id: 'sector_journey',
      meta: { title: 'Recorrido Sectores' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Recorrido Sectores" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items ?? [];

        // Agrupar items por sector con su orden de secuencia
        const sectorMap = new Map<
          string,
          { name: string; seq: number; items: typeof items }
        >();
        items.forEach((item) => {
          const sectorId = item.assigned_sector_id;
          if (!sectorId) return;
          const sectorName = item.workshop_sectors?.name ?? 'Sin sector';
          if (!sectorMap.has(sectorId)) {
            sectorMap.set(sectorId, {
              name: sectorName,
              seq: item.sector_sequence_order ?? 999,
              items: [],
            });
          }
          sectorMap.get(sectorId)!.items.push(item);
        });

        const sectors = Array.from(sectorMap.values()).sort((a, b) => a.seq - b.seq);
        if (sectors.length === 0) {
          return <Badge variant="outline">Sin asignar</Badge>;
        }

        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-1 flex-wrap">
              {sectors.map((sector, idx) => {
                const status = getSectorStatus(sector.items);
                const Icon =
                  status === 'completed' ? CheckCircle2 : status === 'in_progress' ? Play : Circle;
                const statusLabel =
                  status === 'completed'
                    ? 'Completado'
                    : status === 'in_progress'
                      ? 'En progreso'
                      : 'Pendiente';
                return (
                  <Tooltip key={`${sector.name}-${idx}`}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <span className="text-muted-foreground text-[10px]">&rarr;</span>
                        )}
                        <Badge
                          variant={
                            status === 'completed'
                              ? 'secondary'
                              : status === 'in_progress'
                                ? 'info'
                                : 'outline'
                          }
                          className={`text-[10px] gap-1 ${
                            status === 'completed' ? 'opacity-50 line-through' : ''
                          }`}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {sector.name}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>
                        {sector.name} — {statusLabel}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        );
      },
      enableSorting: false,
    },

    // ── Estado ───────────────────────────────────────────────────────────────
    {
      accessorKey: 'status',
      id: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status ?? '';
        const config = WORKSHOP_STATUS_CONFIG[status] ?? {
          label: status || 'Sin estado',
          variant: 'secondary' as const,
          icon: AlertCircle,
        };
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Progreso (virtual — calculado) ───────────────────────────────────────
    {
      id: 'progress',
      meta: { title: 'Progreso' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items ?? [];
        const workItems = items.filter((i) => !i.is_diagnostico);
        const total = workItems.length;
        const assigned = workItems.filter((i) => i.assigned_sector_id).length;
        const percent = total > 0 ? Math.round((assigned / total) * 100) : 0;

        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground">{percent}%</span>
          </div>
        );
      },
      enableSorting: false,
    },

    // ── Fecha de creación ─────────────────────────────────────────────────────
    {
      accessorKey: 'created_at',
      id: 'created_at',
      meta: { title: 'Creado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
      cell: ({ row }) => {
        const date = row.original.created_at;
        return <span>{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
    },

    // ── Acciones ─────────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetail(row.original)}
          className="gap-1"
        >
          <Eye className="h-4 w-4" />
          Ver
        </Button>
      ),
    },
  ];
}

// ============================================================================
// STATUS FILTER OPTIONS (para los filtros faceted del cliente)
// ============================================================================

export const WORKSHOP_STATUS_FILTER_OPTIONS = Object.entries(WORKSHOP_STATUS_CONFIG).map(
  ([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  })
);

// ============================================================================
// EXPORT CONFIG: formatters
// ============================================================================

export function getWorkshopTrackingExportFormatters() {
  return {
    status: (val: unknown) => {
      const s = val as string;
      return WORKSHOP_STATUS_CONFIG[s]?.label ?? s ?? '';
    },
    workshop_entry_date: (val: unknown) => {
      if (!val) return '';
      return moment(val as string).format('DD/MM/YYYY');
    },
    created_at: (val: unknown) => {
      if (!val) return '';
      return moment(val as string).format('DD/MM/YYYY');
    },
    vehicle: (_val: unknown, row: WorkshopTrackingListItem) => {
      const v = row.vehicles;
      if (!v) return '';
      const parts = [v.domain || v.serie || ''];
      if (v.intern_number) parts.push(`(${v.intern_number})`);
      return parts.join(' ');
    },
    sector_journey: (_val: unknown, row: WorkshopTrackingListItem) => {
      const items = row.maintenance_order_items ?? [];
      const sectorMap = new Map<string, { name: string; seq: number }>();
      items.forEach((item) => {
        if (!item.assigned_sector_id) return;
        if (!sectorMap.has(item.assigned_sector_id)) {
          sectorMap.set(item.assigned_sector_id, {
            name: item.workshop_sectors?.name ?? 'Sin sector',
            seq: item.sector_sequence_order ?? 999,
          });
        }
      });
      const sorted = Array.from(sectorMap.values()).sort((a, b) => a.seq - b.seq);
      return sorted.map((s) => s.name).join(' → ') || 'Sin asignar';
    },
    progress: (_val: unknown, row: WorkshopTrackingListItem) => {
      const items = row.maintenance_order_items ?? [];
      const workItems = items.filter((i) => !i.is_diagnostico);
      const total = workItems.length;
      const assigned = workItems.filter((i) => i.assigned_sector_id).length;
      if (total === 0) return '0%';
      return `${Math.round((assigned / total) * 100)}%`;
    },
    days_in_workshop: (_val: unknown, row: WorkshopTrackingListItem) => {
      const date = row.workshop_entry_date;
      if (!date) return '';
      const days = moment().diff(moment(date), 'days');
      return `${days} ${days === 1 ? 'día' : 'días'}`;
    },
  };
}
