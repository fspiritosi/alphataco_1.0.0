'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceOperationData } from '../actions/actionsServer';

interface ColumnsProps {
  onView: (operation: MaintenanceOperationData) => void;
}

export function getReadonlyColumns({ onView }: ColumnsProps): ColumnDef<MaintenanceOperationData>[] {
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

        return (
          <div className="flex flex-col">
            <span className={isToday ? 'font-bold text-green-600' : isPast ? 'text-red-600' : ''}>
              {scheduledDate.format('DD/MM/YYYY')}
            </span>
            {isToday && <span className="text-xs text-green-600">Hoy</span>}
            {isPast && <span className="text-xs text-red-600">Vencido</span>}
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
      accessorKey: 'vehicles.kilometer',
      id: 'Kilometraje',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Km Actual" />,
      cell: ({ row }) => {
        const km = row.original.vehicles?.kilometer;
        return km ? `${km} km` : '-';
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
          { label: string; variant: 'success' | 'destructive' | 'secondary' | 'default' }
        > = {
          scheduled: { label: 'Planificado', variant: 'success' },
          pending_scheduling: { label: 'Pendiente Planificar', variant: 'secondary' },
          in_workshop: { label: 'En Taller', variant: 'default' },
          completed: { label: 'Completado', variant: 'success' },
          rejected: { label: 'Rechazado', variant: 'destructive' },
        };
        const config = statusConfig[status || ''] || {
          label: status || 'Desconocido',
          variant: 'secondary' as const,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const operation = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onView(operation)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
