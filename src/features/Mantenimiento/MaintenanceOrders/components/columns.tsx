'use client';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceOrderData } from '../actions/actionsServer';

interface ColumnsProps {
  onViewDetail: (order: MaintenanceOrderData) => void;
}

export function getMaintenanceOrdersColumns({ onViewDetail }: ColumnsProps): ColumnDef<MaintenanceOrderData>[] {
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
        const domain = vehicle?.domain || vehicle?.serie || '';
        return value.includes(domain);
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
      id: 'SectorActual',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector Actual" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        // Find the sector that is currently active (has items with non-completed work)
        const sectorMap = new Map<string, { name: string; order: number; hasActive: boolean }>();

        items.forEach((item) => {
          const sectorId = item.assigned_sector_id;
          if (!sectorId) return;
          const sectorName =
            item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
              ? (item.workshop_sectors.name as string)
              : 'Sin nombre';
          if (!sectorMap.has(sectorId)) {
            sectorMap.set(sectorId, {
              name: sectorName,
              order: item.sector_sequence_order ?? 999,
              hasActive: false,
            });
          }
        });

        if (sectorMap.size === 0) return <Badge variant="outline">Sin asignar</Badge>;

        // Get first sector by order
        const sorted = Array.from(sectorMap.values()).sort((a, b) => a.order - b.order);
        return <Badge variant="default">{sorted[0].name}</Badge>;
      },
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;

        type StatusVariant = NonNullable<BadgeProps['variant']>;
        type StatusType = 'in_workshop' | 'pending_workshop_validation' | 'pending_operations_validation' | 'completed';

        const statusLabels: Record<StatusType, string> = {
          in_workshop: 'En Taller',
          pending_workshop_validation: 'Pend. Validación Taller',
          pending_operations_validation: 'Pend. Validación Operaciones',
          completed: 'Completada',
        };

        const statusVariants: Record<StatusType, StatusVariant> = {
          in_workshop: 'default',
          pending_workshop_validation: 'yellow',
          pending_operations_validation: 'yellow',
          completed: 'success',
        };

        const label = statusLabels[status as StatusType] || status || 'Sin estado';
        const variant = statusVariants[status as StatusType] || 'default';

        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, _id, value) => {
        return value.includes(row.original.status);
      },
    },
    {
      id: 'Progreso',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];

        // Calcular progreso basado en work_order_item_repairs completados
        let totalRepairs = 0;
        let completedRepairs = 0;

        for (const item of items) {
          if (item.is_diagnostico) continue;
          const workOrders = item.work_orders;
          if (workOrders && typeof workOrders === 'object' && 'work_order_items' in workOrders) {
            const woItems = workOrders.work_order_items;
            if (Array.isArray(woItems)) {
              for (const woItem of woItems) {
                if (woItem.work_order_item_repairs && Array.isArray(woItem.work_order_item_repairs)) {
                  for (const repair of woItem.work_order_item_repairs) {
                    totalRepairs++;
                    if (repair.status === 'completed') {
                      completedRepairs++;
                    }
                  }
                }
              }
            }
          }
        }

        const percent = totalRepairs > 0 ? Math.round((completedRepairs / totalRepairs) * 100) : 0;

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
          Ver detalle
        </Button>
      ),
      enableSorting: false,
    },
  ];
}
