'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, Eye, LogIn } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceOrderData } from '../actions/actionsServer';

interface ColumnsProps {
  onView: (order: MaintenanceOrderData) => void;
  onSchedule: (order: MaintenanceOrderData) => void;
  onApproveWorkshopEntry: (order: MaintenanceOrderData) => void;
}

export function getColumns({
  onView,
  onSchedule,
  onApproveWorkshopEntry,
}: ColumnsProps): ColumnDef<MaintenanceOrderData>[] {
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
        const statusConfig: Record<
          string,
          { label: string; variant: 'warning' | 'success' | 'default' | 'secondary' | 'destructive' }
        > = {
          pending_scheduling: { label: 'Pendiente Planificar', variant: 'warning' },
          scheduled: { label: 'Planificado', variant: 'secondary' },
          date_confirmed: { label: 'Fecha Confirmada', variant: 'success' },
          in_workshop: { label: 'En Taller', variant: 'default' },
          completed: { label: 'Completado', variant: 'secondary' },
          rejected: { label: 'Rechazado', variant: 'destructive' },
        };
        const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const order = row.original;
        const isPendingScheduling = order.status === 'pending_scheduling';
        const isDateConfirmed = order.status === 'date_confirmed';

        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onView(order)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            {isPendingScheduling && (
              <PermissionGuard module="mantenimiento" tab="maintenance_orders" action="update">
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
            {isDateConfirmed && (
              <PermissionGuard module="mantenimiento" tab="maintenance_orders" action="update">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onApproveWorkshopEntry(order)}
                  title="Aprobar Entrada a Taller"
                  className="text-green-600 hover:text-green-700"
                >
                  <LogIn className="h-4 w-4" />
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
