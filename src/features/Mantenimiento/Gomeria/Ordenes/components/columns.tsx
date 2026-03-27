'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  tireServiceOrderStatusBadges,
  tireServiceOrderStatusLabels,
} from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, CircleOff, Eye, Lock, Play } from 'lucide-react';
import moment from 'moment';
import type { ServiceOrderListItem } from '../actions/actions.server';

// ============================================================================
// TYPES
// ============================================================================

type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

// ============================================================================
// COLUMNS
// ============================================================================

export function getColumns(
  permissions: Permissions,
  onClose: (order: ServiceOrderListItem) => void,
  onCancel: (order: ServiceOrderListItem) => void,
  onViewDetail?: (order: ServiceOrderListItem) => void,
  onContinue?: (order: ServiceOrderListItem) => void
): ColumnDef<ServiceOrderListItem>[] {
  const canUpdate = permissions.hasPermission('mantenimiento', 'ordenes_gomeria', 'update');

  return [
    // --- Select ---
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { excludeFromExport: true, title: '' },
    },

    // --- Service Date ---
    {
      id: 'service_date',
      accessorKey: 'service_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <div>{row.original.service_date ? moment(row.original.service_date).format('DD/MM/YYYY') : '-'}</div>
      ),
      meta: { title: 'Fecha' },
    },

    // --- Vehicle ---
    {
      id: 'vehicle_id',
      accessorFn: (row) => row.vehicle?.domain ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo" />,
      cell: ({ row }) => {
        const domain = row.original.vehicle?.domain;
        if (!domain) return <div className="text-muted-foreground">-</div>;
        return <Badge variant="outline">{domain}</Badge>;
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.vehicle_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      meta: { title: 'Vehículo' },
    },

    // --- Trailer ---
    {
      id: 'trailer_vehicle_id',
      accessorFn: (row) => row.trailer?.domain ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Enganche" />,
      cell: ({ row }) => {
        const domain = row.original.trailer?.domain;
        if (!domain)
          return (
            <div className="inline-flex items-center gap-1 text-muted-foreground">
              <CircleOff className="h-3 w-3" />
              Sin asignar
            </div>
          );
        return <Badge variant="outline">{domain}</Badge>;
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.trailer_vehicle_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      meta: { title: 'Enganche' },
    },

    // --- Kilometer ---
    {
      id: 'kilometer',
      accessorKey: 'kilometer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilómetros" />,
      cell: ({ row }) => {
        const km = row.original.kilometer;
        if (!km) return <div className="text-muted-foreground">-</div>;
        return <div className="font-mono text-sm">{km}</div>;
      },
      meta: { title: 'Kilómetros' },
    },

    // --- Interventions (virtual) ---
    {
      id: 'interventions',
      accessorFn: (row) => row._count?.items ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Intervenciones" />,
      cell: ({ row }) => {
        const count = row.original._count?.items ?? 0;
        return <Badge variant={count > 0 ? 'default' : 'outline'}>{count}</Badge>;
      },
      enableSorting: false,
      meta: { title: 'Intervenciones' },
    },

    // --- Status ---
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={tireServiceOrderStatusBadges[status] ?? 'default'}>
            {tireServiceOrderStatusLabels[status] ?? status}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
      meta: { title: 'Estado' },
    },

    // --- Created By ---
    {
      id: 'created_by',
      accessorFn: (row) => row.creator?.fullname ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creado por" />,
      cell: ({ row }) => {
        const name = row.original.creator?.fullname;
        return <div>{name ?? <span className="text-muted-foreground">-</span>}</div>;
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.created_by;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      meta: { title: 'Creado por' },
    },

    // --- Created At ---
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
      cell: ({ row }) => (
        <div>{row.original.created_at ? moment(row.original.created_at).format('DD/MM/YYYY') : '-'}</div>
      ),
      meta: { title: 'Creado' },
    },

    // --- Actions ---
    {
      id: 'actions',
      cell: ({ row }: { row: import('@tanstack/react-table').Row<ServiceOrderListItem> }) => {
        const isOpen = row.original.status === 'OPEN';
        return (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1">
              {onViewDetail && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetail(row.original)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver detalle</TooltipContent>
                </Tooltip>
              )}
              {isOpen && canUpdate && (
                <>
                  {onContinue && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          onClick={() => onContinue(row.original)}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Continuar intervenciones</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onClose(row.original)}>
                        <Lock className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Finalizar orden</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onCancel(row.original)}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Anular orden</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>
        );
      },
      enableSorting: false,
      enableHiding: false,
      meta: { title: '', excludeFromExport: true },
    } satisfies ColumnDef<ServiceOrderListItem>,
  ];
}
