'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Eye, Play } from 'lucide-react';
import moment from 'moment';
import { WORK_ORDER_STATUS_LABELS, WORK_ORDER_STATUS_VARIANTS, type WorkOrderRowData } from '../types';

interface ColumnsProps {
  onViewDetail: (workOrder: WorkOrderRowData) => void;
  onStart?: (workOrder: WorkOrderRowData) => void;
  onComplete?: (workOrder: WorkOrderRowData) => void;
}

export function getColumns({ onViewDetail, onStart, onComplete }: ColumnsProps): ColumnDef<WorkOrderRowData>[] {
  return [
    {
      accessorKey: 'orderNumber',
      id: 'NroOrden',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nº Orden" />,
      cell: ({ row }) => {
        return <span className="font-mono font-medium text-sm">{row.original.orderNumber}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'vehicleDomain',
      id: 'Equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const domain = row.original.vehicleDomain;
        const serie = row.original.vehicleSerie;
        const internNumber = row.original.vehicleInternNumber;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{domain || serie || 'Sin identificar'}</span>
            {internNumber && <span className="text-xs text-muted-foreground">#{internNumber}</span>}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const vehicleLabel = row.original.vehicleDomain || row.original.vehicleSerie || 'Sin identificar';
        return value.includes(vehicleLabel);
      },
      enableSorting: true,
    },
    {
      accessorKey: 'workshopName',
      id: 'Taller',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Taller" />,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span>{row.original.workshopName}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.workshopType === 'interno' ? 'Interno' : 'Externo'}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.workshopName);
      },
      enableSorting: true,
    },
    {
      accessorKey: 'sectorName',
      id: 'Sector',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) => {
        return <span>{row.original.sectorName || '-'}</span>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.sectorName || '-');
      },
      enableSorting: true,
    },
    {
      accessorKey: 'totalItems',
      id: 'Items',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => {
        const total = row.original.totalItems;
        const completed = row.original.completedItems;

        // Para un solo item, mostrar solo el estado simplificado
        if (total === 1) {
          return completed === 1 ? (
            <Badge variant="success" className="text-xs">
              Completado
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              1 item
            </Badge>
          );
        }

        // Para múltiples items, mostrar progreso
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div className="flex flex-col gap-1 min-w-[100px]">
            <div className="flex justify-between text-xs">
              <span>
                {completed}/{total}
              </span>
              <span className="text-muted-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'plannedStartDate',
      id: 'Periodo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Período" />,
      cell: ({ row }) => {
        const start = row.original.plannedStartDate;
        const end = row.original.plannedEndDate;
        return (
          <div className="flex flex-col text-sm">
            <span>{moment(start).format('DD/MM')}</span>
            <span className="text-muted-foreground">al {moment(end).format('DD/MM')}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        return <Badge variant={WORK_ORDER_STATUS_VARIANTS[status]}>{WORK_ORDER_STATUS_LABELS[status]}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.status);
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const workOrder = row.original;
        const isPending = workOrder.status === 'pending';
        const isInProgress = workOrder.status === 'in_progress';
        const allItemsCompleted = workOrder.completedItems === workOrder.totalItems && workOrder.totalItems > 0;

        return (
          <div className="flex items-center gap-1">
            {/* Ver detalle - siempre visible */}
            <Button variant="ghost" size="icon" onClick={() => onViewDetail(workOrder)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>

            {/* Iniciar trabajo - solo en pending */}
            {isPending && onStart && (
              <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onStart(workOrder)}
                  title="Iniciar trabajo"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}

            {/* Completar OT - solo en in_progress y con todos los items completados */}
            {isInProgress && allItemsCompleted && onComplete && (
              <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onComplete(workOrder)}
                  title="Completar orden"
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
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
