'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels } from '@/shared/utils/mappers';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, CheckCircle2, Clock, Eye, XCircle, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import type { PendingExecutionListItem } from './actions.server';

// ============================================================================
// CONSTANTES DE STATUS
// ============================================================================

export const STATUS_LABELS: Record<string, string> = {
  pending_scheduling: 'Pendiente Programación',
  scheduled: 'Pendiente Aprobación',
};

export const STATUS_ICONS: Record<string, LucideIcon> = {
  pending_scheduling: Calendar,
  scheduled: Clock,
};

export const STATUS_BADGE: Record<string, 'warning' | 'secondary'> = {
  pending_scheduling: 'secondary',
  scheduled: 'warning',
};

// ============================================================================
// COLUMNAS OCULTAS POR DEFECTO
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['kilometer', 'condition', 'order_number'];

// ============================================================================
// PROPS DE COLUMNAS
// ============================================================================

interface ColumnsProps {
  onView: (order: PendingExecutionListItem) => void;
  onApprove: (order: PendingExecutionListItem) => void;
  onReject: (order: PendingExecutionListItem) => void;
  canApproveReject?: boolean;
}

// ============================================================================
// FUNCIÓN DE COLUMNAS
// ============================================================================

export function getPendingExecutionColumns({
  onView,
  onApprove,
  onReject,
  canApproveReject = false,
}: ColumnsProps): ColumnDef<PendingExecutionListItem>[] {
  return [
    // Equipo (vehicle FK)
    {
      id: 'vehicle',
      accessorFn: (row) => {
        const v = row.vehicles;
        return v?.domain || v?.serie || 'Sin identificar';
      },
      meta: { title: 'Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        if (!vehicle) return <span className="text-muted-foreground">-</span>;
        const label = vehicle.domain || vehicle.serie || 'Sin identificar';
        return (
          <div className="flex flex-col">
            <span className="font-medium">{label}</span>
            {vehicle.intern_number && <span className="text-xs text-muted-foreground">#{vehicle.intern_number}</span>}
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const vehicleId = row.original.vehicles?.id;
        if (!vehicleId) return value.includes(NULL_FILTER_VALUE);
        return value.includes(vehicleId);
      },
      enableSorting: true,
    },

    // Fecha Planificada (con color coding)
    {
      id: 'scheduled_date',
      accessorKey: 'scheduled_date',
      meta: { title: 'Fecha Planificada' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Planificada" />,
      cell: ({ row }) => {
        const date = row.original.scheduled_date;
        if (!date) return <span className="text-muted-foreground">-</span>;

        const scheduledDate = moment.utc(date);
        const today = moment().startOf('day');
        const isToday = scheduledDate.isSame(today, 'day');
        const isPast = scheduledDate.isBefore(today);
        const isTomorrow = scheduledDate.isSame(today.clone().add(1, 'day'), 'day');

        return (
          <div className="flex flex-col">
            <span
              className={
                isToday ? 'font-bold text-green-600' : isPast ? 'text-red-600' : isTomorrow ? 'text-orange-600' : ''
              }
            >
              {scheduledDate.format('DD/MM/YYYY')}
            </span>
            {isToday && <span className="text-xs text-green-600">Hoy</span>}
            {isPast && <span className="text-xs text-red-600">Vencido</span>}
            {isTomorrow && <span className="text-xs text-orange-600">Mañana</span>}
          </div>
        );
      },
      enableSorting: true,
    },

    // Items count
    {
      id: 'items_count',
      accessorFn: (row) => row.maintenance_order_items?.length ?? 0,
      meta: { title: 'Items' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        if (items.length === 0 && row.original.maintenance_requests?.source === 'preventive') {
          return <PreventiveItemsBadge preventiveType={row.original.maintenance_requests?.preventive_type ?? ''} />;
        }
        return (
          <Badge variant="secondary">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Badge>
        );
      },
      enableSorting: false,
    },

    // Estado
    {
      id: 'status',
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const label = STATUS_LABELS[status] ?? status;
        const variant = STATUS_BADGE[status] ?? 'secondary';
        const Icon = STATUS_ICONS[status];
        return (
          <Badge variant={variant} className="flex items-center gap-1 w-fit">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string;
        return value.includes(val);
      },
      enableSorting: true,
    },

    // Condición del vehículo (hidden by default)
    {
      id: 'condition',
      accessorFn: (row) => row.vehicles?.condition ?? null,
      meta: { title: 'Condición' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => {
        const condition = row.original.vehicles?.condition;
        if (!condition) return <span className="text-muted-foreground">-</span>;
        const variantMap: Record<string, 'success' | 'destructive' | 'secondary' | 'warning'> = {
          operativo: 'success',
          no_operativo: 'destructive',
          en_reparacion: 'destructive',
          operativo_condicionado: 'warning',
          en_preparacion: 'secondary',
        };
        const label = conditionLabels[condition] ?? condition;
        const variant = variantMap[condition] ?? 'secondary';
        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, _id, value: string[]) => {
        const condition = row.original.vehicles?.condition ?? null;
        if (condition == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(condition);
      },
      enableSorting: false,
    },

    // Km Solicitud (hidden by default)
    {
      id: 'kilometer',
      accessorFn: (row) => row.maintenance_requests?.kilometer ?? '',
      meta: { title: 'Km Solicitud' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Km Solicitud" />,
      cell: ({ row }) => {
        const km = row.original.maintenance_requests?.kilometer;
        if (!km) return <span className="text-muted-foreground">-</span>;
        return <span>{Number(km).toLocaleString()} km</span>;
      },
      enableSorting: false,
    },

    // Número de orden (hidden by default)
    {
      id: 'order_number',
      accessorKey: 'order_number',
      meta: { title: 'N° Orden' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
      cell: ({ row }) => {
        const orderNumber = row.original.order_number;
        if (!orderNumber) return <span className="text-muted-foreground">-</span>;
        return <span className="font-mono text-sm">{orderNumber}</span>;
      },
      enableSorting: true,
    },

    // Acciones
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      header: '',
      cell: ({ row }) => {
        const order = row.original;
        const isPendingApproval = order.status === 'scheduled';

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onView(order)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            {isPendingApproval && canApproveReject && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onApprove(order)}
                  title="Aprobar fecha"
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReject(order)}
                  title="Rechazar fecha"
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

// Exportar icono de calendario para uso en filtro de fecha
export { Calendar };
