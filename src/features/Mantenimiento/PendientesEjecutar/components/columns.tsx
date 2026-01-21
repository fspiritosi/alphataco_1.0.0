'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Eye, XCircle } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceOrderPendingApprovalData } from '../../actions/actionsServer';

interface ColumnsProps {
  onView: (order: MaintenanceOrderPendingApprovalData) => void;
  onApprove: (order: MaintenanceOrderPendingApprovalData) => void;
  onReject: (order: MaintenanceOrderPendingApprovalData) => void;
}

export function getColumns({
  onView,
  onApprove,
  onReject,
}: ColumnsProps): ColumnDef<MaintenanceOrderPendingApprovalData>[] {
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
      accessorKey: 'scheduled_date',
      id: 'FechaPlanificada',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Planificada" />,
      cell: ({ row }) => {
        const date = row.original.scheduled_date;
        if (!date) return <span className="text-muted-foreground">-</span>;

        const scheduledDate = moment(date);
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
      accessorKey: 'vehicles.condition',
      id: 'Condicion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición Actual" />,
      cell: ({ row }) => {
        const condition = row.original.vehicles?.condition;
        const conditionConfig: Record<string, { label: string; variant: 'success' | 'destructive' | 'secondary' }> = {
          operativo: { label: 'Operativo', variant: 'success' },
          'no operativo': { label: 'No Operativo', variant: 'destructive' },
        };
        const config = conditionConfig[condition || ''] || {
          label: condition || 'Desconocido',
          variant: 'secondary' as const,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      enableSorting: false,
    },
    {
      accessorKey: 'maintenance_requests.kilometer',
      id: 'Kilometraje',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Km Solicitud" />,
      cell: ({ row }) => {
        const km = row.original.maintenance_requests?.kilometer;
        return km ? `${km.toLocaleString()} km` : '-';
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const order = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onView(order)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <PermissionGuard module="mantenimiento" tab="pendientes_ejecutar" action="update">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onApprove(order)}
                title="Aprobar fecha"
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircle className="h-4 w-4" />
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
            </PermissionGuard>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
