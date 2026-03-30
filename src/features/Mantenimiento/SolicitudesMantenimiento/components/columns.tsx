'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreventiveItemsBadge } from '@/features/Mantenimiento/components/PreventiveItemsBadge';
import { formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { resolveDriverName } from '@/features/Mantenimiento/utils/driverInfo';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Eye, History, UserRoundCog, XCircle } from 'lucide-react';
import type { MaintenanceRequestData } from '../actions/actionsServer';

interface ColumnsProps {
  onView: (request: MaintenanceRequestData) => void;
  onApprove: (request: MaintenanceRequestData) => void;
  onReject: (request: MaintenanceRequestData) => void;
  onViewHistory: (request: MaintenanceRequestData) => void;
  onReassign?: (request: MaintenanceRequestData) => void;
}

export function getColumns({
  onView,
  onApprove,
  onReject,
  onViewHistory,
  onReassign,
}: ColumnsProps): ColumnDef<MaintenanceRequestData>[] {
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
      id: 'Fecha',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Solicitud" />,
      cell: ({ row }) => {
        return formatDateTime(row.original.created_at);
      },
    },
    {
      accessorKey: 'maintenance_request_items',
      id: 'Items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.maintenance_request_items || [];
        if (items.length === 0 && row.original.source === 'preventive') {
          return <PreventiveItemsBadge preventiveType={row.original.preventive_type ?? ''} />;
        }
        return (
          <Badge variant="secondary">
            {items.length} {items.length === 1 ? 'desvío' : 'desvíos'}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'checklist_answers',
      id: 'Chofer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chofer" />,
      cell: ({ row }) => {
        const name = resolveDriverName(row.original);
        return name && name !== 'No especificado' ? (
          <span>{name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const maintenanceOrder = row.original.maintenance_orders?.[0];
        const orderStatus = maintenanceOrder?.status;

        // Si la solicitud está aprobada, mostrar el estado del pedido de mantenimiento
        if (status === 'approved' && orderStatus) {
          const orderStatusConfig: Record<
            string,
            { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' | 'default' }
          > = {
            pending_scheduling: { label: 'Pend. Programación', variant: 'secondary' },
            scheduled: { label: 'Programada', variant: 'warning' },
            date_confirmed: { label: 'Fecha Confirmada', variant: 'success' },
            date_rejected: { label: 'Fecha Rechazada', variant: 'destructive' },
            in_workshop: { label: 'En Taller', variant: 'default' },
            completed: { label: 'Completada', variant: 'success' },
            rejected: { label: 'Rechazada', variant: 'destructive' },
          };
          const orderConfig = orderStatusConfig[orderStatus] || { label: orderStatus, variant: 'secondary' as const };
          return <Badge variant={orderConfig.variant}>{orderConfig.label}</Badge>;
        }

        // Mostrar estado de la solicitud
        const statusConfig: Record<
          string,
          { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }
        > = {
          pending_approval: { label: 'Pendiente', variant: 'warning' },
          approved: { label: 'Aprobada', variant: 'success' },
          rejected: { label: 'Rechazada', variant: 'destructive' },
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
        const request = row.original;
        const isPending = request.status === 'pending_approval';

        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onView(request)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewHistory(request)}
              title="Ver historial"
              className="text-blue-600 hover:text-blue-700"
            >
              <History className="h-4 w-4" />
            </Button>
            {isPending && (
              <PermissionGuard module="mantenimiento" tab="maintenance_requests" action="update">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onApprove(request)}
                  title="Aprobar"
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReject(request)}
                  title="Rechazar"
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                {onReassign && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReassign(request)}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <UserRoundCog className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reasignar supervisor</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </PermissionGuard>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
