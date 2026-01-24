'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, Eye } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceOrderData } from '../../actions/actionsServer';

interface ColumnsPendientesProps {
  onView: (order: MaintenanceOrderData) => void;
  onSchedule: (order: MaintenanceOrderData) => void;
}

export function getColumnsPendientes({
  onView,
  onSchedule,
}: ColumnsPendientesProps): ColumnDef<MaintenanceOrderData>[] {
  return [
    {
      accessorKey: 'vehicles',
      id: 'Equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{vehicle?.domain || vehicle?.serie || 'Sin identificar'}</span>
            {vehicle?.intern_number && <span className="text-xs text-muted-foreground">#{vehicle.intern_number}</span>}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const vehicle = row.original.vehicles;
        const vehicleLabel = vehicle?.domain || vehicle?.serie || 'Sin identificar';
        return value.includes(vehicleLabel);
      },
      enableSorting: false,
    },
    {
      accessorKey: 'created_at',
      id: 'FechaAprobacion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Aprobación" />,
      cell: ({ row }) => {
        return moment(row.original.created_at).format('DD/MM/YYYY HH:mm');
      },
    },
    {
      accessorKey: 'maintenance_order_items',
      id: 'Items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
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
        return moment(date).format('DD/MM/YYYY');
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onView(order)} title="Ver detalle">
              <Eye className="h-4 w-4" />
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
