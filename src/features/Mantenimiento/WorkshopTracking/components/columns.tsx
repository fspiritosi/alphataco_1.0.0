'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceOrderData } from '../../MaintenanceOrders/actions/actionsServer';

interface ColumnsProps {
  onViewDetail: (order: MaintenanceOrderData) => void;
}

export function getWorkshopTrackingColumns({ onViewDetail }: ColumnsProps): ColumnDef<MaintenanceOrderData>[] {
  return [
    {
      accessorKey: 'order_number',
      id: 'order_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.order_number || '-'}</span>,
    },
    {
      accessorKey: 'vehicles.domain',
      id: 'Equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        return (
          <div>
            <span className="font-medium">{vehicle?.domain || vehicle?.serie || '-'}</span>
            {vehicle?.intern_number && (
              <span className="text-muted-foreground ml-1 text-xs">({vehicle.intern_number})</span>
            )}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        const vehicle = row.original.vehicles;
        return value.includes(vehicle?.domain || vehicle?.serie || '');
      },
    },
    {
      accessorKey: 'workshop_entry_date',
      id: 'Ingreso',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ingreso" />,
      cell: ({ row }) => {
        const date = row.original.workshop_entry_date;
        return <span>{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
    },
    {
      id: 'DiasEnTaller',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dias en Taller" />,
      cell: ({ row }) => {
        const date = row.original.workshop_entry_date;
        if (!date) return <span>-</span>;
        const days = moment().diff(moment(date), 'days');
        return (
          <Badge variant={days > 7 ? 'destructive' : days > 3 ? 'warning' : 'secondary'}>
            {days} {days === 1 ? 'dia' : 'dias'}
          </Badge>
        );
      },
    },
    {
      id: 'SectorActual',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector Actual" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        const sectors = new Set<string>();
        items.forEach((item) => {
          if (
            item.assigned_sector_id &&
            item.workshop_sectors &&
            typeof item.workshop_sectors === 'object' &&
            'name' in item.workshop_sectors
          ) {
            sectors.add(item.workshop_sectors.name as string);
          }
        });
        if (sectors.size === 0) return <Badge variant="outline">Sin asignar</Badge>;
        return (
          <div className="flex gap-1">
            {Array.from(sectors).map((s) => (
              <Badge key={s} variant="default">
                {s}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'Progreso',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        const total = items.filter((i) => !i.is_diagnostico).length;
        const assigned = items.filter((i) => i.assigned_sector_id && !i.is_diagnostico).length;
        const percent = total > 0 ? Math.round((assigned / total) * 100) : 0;

        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground">{percent}%</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onViewDetail(row.original)}>
          <Eye className="h-4 w-4 mr-1" />
          Ver
        </Button>
      ),
      enableSorting: false,
    },
  ];
}
