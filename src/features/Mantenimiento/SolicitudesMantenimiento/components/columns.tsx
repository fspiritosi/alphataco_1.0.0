'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Eye, XCircle } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceRequestData } from '../actions/actionsServer';

interface ColumnsProps {
  onView: (request: MaintenanceRequestData) => void;
  onApprove: (request: MaintenanceRequestData) => void;
  onReject: (request: MaintenanceRequestData) => void;
}

export function getColumns({ onView, onApprove, onReject }: ColumnsProps): ColumnDef<MaintenanceRequestData>[] {
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
        return moment(row.original.created_at).format('DD/MM/YYYY HH:mm');
      },
    },
    {
      accessorKey: 'maintenance_request_items',
      id: 'Items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.maintenance_request_items || [];
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
      id: 'Creador',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creado por" />,
      cell: ({ row }) => {
        // Primero intentar obtener del empleado vinculado
        const employee = row.original.employees;
        if (employee) {
          return `${employee.firstname} ${employee.lastname}`;
        }
        // Si no hay empleado, obtener el nombre del chofer desde el checklist
        const answerData = row.original.checklist_answers?.answer_data as { chofer?: string } | null;
        if (answerData?.chofer) {
          return answerData.chofer;
        }
        return <span className="text-muted-foreground">-</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
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
              </PermissionGuard>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
