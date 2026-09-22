'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import moment from 'moment';
import type { OrderManagementItem } from '../actions/queries.server';

interface ColumnsProps {
  onManage: (order: OrderManagementItem) => void;
}

export function getOrderManagementColumns({ onManage }: ColumnsProps): ColumnDef<OrderManagementItem>[] {
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
        const domain = vehicle?.domain || vehicle?.serie || '-';
        const internNumber = vehicle?.intern_number;
        return (
          <div>
            <span className="font-medium">{domain}</span>
            {internNumber && <span className="text-muted-foreground ml-1 text-xs">({internNumber})</span>}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        const vehicle = row.original.vehicles;
        const domain = vehicle?.domain || vehicle?.serie || '';
        return value.includes(domain);
      },
    },
    {
      accessorKey: 'vehicles.vehicle_type.name',
      id: 'Tipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        const typeName = row.original.vehicles?.vehicle_type?.name;
        return <span>{typeName || '-'}</span>;
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
      id: 'Items',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        const total = items.length;
        const assigned = items.filter((i) => i.assigned_sector_id).length;
        return (
          <div className="flex items-center gap-1">
            <Badge variant={assigned === total && total > 0 ? 'success' : 'secondary'}>
              {assigned}/{total}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'Sectores',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sectores" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        const sectorNames = new Set<string>();
        items.forEach((item) => {
          if (item.workshop_sectors && 'name' in item.workshop_sectors) {
            sectorNames.add(item.workshop_sectors.name);
          }
        });
        if (sectorNames.size === 0) return <Badge variant="outline">Sin asignar</Badge>;
        return (
          <div className="flex flex-wrap gap-1">
            {Array.from(sectorNames).map((name) => (
              <Badge key={name} variant="default">
                {name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onManage(row.original)}>
          <Settings2 className="h-4 w-4 mr-1" />
          Gestionar
        </Button>
      ),
      enableSorting: false,
    },
  ];
}
