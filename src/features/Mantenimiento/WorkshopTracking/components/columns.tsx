'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Circle, Eye, Play } from 'lucide-react';
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Recorrido Sectores" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];

        // Group items by sector with sequence order
        const sectorMap = new Map<string, { name: string; seq: number; items: typeof items }>();
        items.forEach((item) => {
          const sectorId = item.assigned_sector_id;
          if (!sectorId) return;
          const sectorName =
            item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
              ? (item.workshop_sectors.name as string)
              : 'Sin sector';
          if (!sectorMap.has(sectorId)) {
            sectorMap.set(sectorId, { name: sectorName, seq: item.sector_sequence_order ?? 999, items: [] });
          }
          sectorMap.get(sectorId)!.items.push(item);
        });

        const sectors = Array.from(sectorMap.values()).sort((a, b) => a.seq - b.seq);
        if (sectors.length === 0) return <Badge variant="outline">Sin asignar</Badge>;

        // Determine status per sector based on work_order_item_repairs
        const getSectorStatus = (sectorItems: typeof items): 'completed' | 'in_progress' | 'pending' => {
          const repairs = sectorItems.flatMap((item) => {
            const wo = item.work_orders;
            if (!wo || Array.isArray(wo)) return [];
            return (wo.work_order_items || [])
              .filter((woi: { maintenance_order_item_id?: string }) => woi.maintenance_order_item_id === item.id)
              .flatMap(
                (woi: { work_order_item_repairs?: unknown[] }) =>
                  (woi.work_order_item_repairs || []) as Array<{ status: string }>
              );
          });
          if (repairs.length === 0) return 'pending';
          const completed = repairs.filter((r) => r.status === 'completed').length;
          if (completed === repairs.length) return 'completed';
          if (completed > 0 || repairs.some((r) => r.status === 'in_progress')) return 'in_progress';
          return 'pending';
        };

        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-1">
              {sectors.map((sector, idx) => {
                const status = getSectorStatus(sector.items);
                const Icon = status === 'completed' ? CheckCircle2 : status === 'in_progress' ? Play : Circle;
                return (
                  <Tooltip key={sector.name}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        {idx > 0 && <span className="text-muted-foreground text-[10px]">&rarr;</span>}
                        <Badge
                          variant={status === 'completed' ? 'secondary' : status === 'in_progress' ? 'info' : 'outline'}
                          className={`text-[10px] gap-1 ${status === 'completed' ? 'opacity-50 line-through' : ''}`}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {sector.name}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>
                        {sector.name} —{' '}
                        {status === 'completed' ? 'Completado' : status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const statusMap: Record<
          string,
          { label: string; variant: 'default' | 'info' | 'yellow' | 'success' | 'secondary' | 'destructive' }
        > = {
          in_workshop: { label: 'En Taller', variant: 'info' },
          pending_workshop_validation: { label: 'Pend. Validación Taller', variant: 'yellow' },
          pending_operations_validation: { label: 'Pend. Validación Operaciones', variant: 'yellow' },
          operations_rejected: { label: 'Rechazada por Ops', variant: 'destructive' },
          workshop_rejected: { label: 'Rechazada por Taller', variant: 'destructive' },
          completed: { label: 'Completada', variant: 'success' },
        };
        const config = statusMap[status ?? ''] || { label: status || 'Sin estado', variant: 'secondary' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
      filterFn: (row, _id, value) => {
        return value.includes(row.original.status ?? '');
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
