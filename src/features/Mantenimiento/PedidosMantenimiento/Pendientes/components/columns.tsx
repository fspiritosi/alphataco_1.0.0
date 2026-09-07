'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
import {
  getResourceInternNumber,
  getResourceKind,
  getResourceLabel,
} from '@/features/Mantenimiento/shared/maintenance-resource';
import { formatDateOnly, formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, Eye, History } from 'lucide-react';
import type { MaintenanceOrderData } from '../../actions/actionsServer';

interface ColumnsPendientesProps {
  onView: (order: MaintenanceOrderData) => void;
  onSchedule: (order: MaintenanceOrderData) => void;
  onViewHistory: (order: MaintenanceOrderData) => void;
}

export function getColumnsPendientes({
  onView,
  onSchedule,
  onViewHistory,
}: ColumnsPendientesProps): ColumnDef<MaintenanceOrderData>[] {
  return [
    {
      accessorKey: 'vehicles',
      id: 'Equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        // Vehiculo o equipamiento (ticket 596)
        const internNumber = getResourceInternNumber(row.original);
        const isOther = getResourceKind(row.original) === 'other_equipment';
        return (
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 font-medium">
              {getResourceLabel(row.original)}
              {isOther && (
                <Badge variant="outline" className="text-xs">
                  Equipamiento
                </Badge>
              )}
            </span>
            {internNumber && <span className="text-xs text-muted-foreground">#{internNumber}</span>}
          </div>
        );
      },
      filterFn: (row, id, value) => value.includes(getResourceLabel(row.original)),
      enableSorting: false,
    },
    {
      accessorKey: 'created_at',
      id: 'FechaAprobacion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Aprobación" />,
      cell: ({ row }) => {
        return formatDateTime(row.original.created_at);
      },
    },
    {
      accessorKey: 'maintenance_order_items',
      id: 'Items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        if (items.length === 0 && row.original.source === 'preventive') {
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
    {
      accessorKey: 'scheduled_date',
      id: 'FechaPlanificada',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Planificada" />,
      cell: ({ row }) => {
        const date = row.original.scheduled_date;
        if (!date) return <span className="text-muted-foreground">Sin planificar</span>;
        return formatDateOnly(date);
      },
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const statusConfig: Record<string, { label: string; variant: 'warning' | 'secondary' }> = {
          pending_scheduling: { label: 'Pendiente Planificar', variant: 'warning' },
          scheduled: { label: 'Pendiente Aprobación', variant: 'secondary' },
        };
        const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.status);
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const order = row.original;
        const isPendingScheduling = order.status === 'pending_scheduling';

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onView(order)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewHistory(order)}
              title="Ver historial"
              className="text-purple-600 hover:text-purple-700"
            >
              <History className="h-4 w-4" />
            </Button>
            {isPendingScheduling && (
              <PermissionGuard module="mantenimiento" tab="pedidos_pendientes" action="update">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSchedule(order)}
                  title="Planificar fecha"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
