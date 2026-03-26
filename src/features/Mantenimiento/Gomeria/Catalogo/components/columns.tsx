'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  tireRetreadLabels,
  tireStatusBadges,
  tireStatusLabels,
  tireTreadTypeLabels,
} from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import moment from 'moment';
import type { TireListItem } from '../actions/actions.server';

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
  onEdit: (tire: TireListItem) => void,
  onDelete: (tire: TireListItem) => void
): ColumnDef<TireListItem>[] {
  const canUpdate = permissions.hasPermission('mantenimiento', 'tire_catalog', 'update');
  const canDelete = permissions.hasPermission('mantenimiento', 'tire_catalog', 'delete');

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

    // --- Serial Number ---
    {
      id: 'serial_number',
      accessorKey: 'serial_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => <div className="font-mono text-sm font-medium">{row.original.serial_number}</div>,
      meta: { title: 'Número' },
    },

    // --- Brand ---
    {
      id: 'brand_id',
      accessorFn: (row) => row.brand?.name ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => <div>{row.original.brand?.name ?? <span className="text-muted-foreground">-</span>}</div>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.brand_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
      meta: { title: 'Marca' },
    },

    // --- Size ---
    {
      id: 'size',
      accessorKey: 'size',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Medida" />,
      cell: ({ row }) => <div className="font-mono text-sm">{row.original.size}</div>,
      meta: { title: 'Medida' },
    },

    // --- Is New ---
    {
      id: 'is_new',
      accessorKey: 'is_new',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_new ? 'success' : 'outline'}>{row.original.is_new ? 'Nueva' : 'Usada'}</Badge>
      ),
      filterFn: (row, id, value: string[]) => {
        return value.includes(String(row.getValue(id)));
      },
      meta: { title: 'Condición' },
    },

    // --- Retread Level (nullable) ---
    {
      id: 'retread_level',
      accessorKey: 'retread_level',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Precurado" />,
      cell: ({ row }) => {
        const val = row.original.retread_level;
        if (!val) return <div className="text-muted-foreground">-</div>;
        return <Badge variant="outline">{tireRetreadLabels[val] ?? val}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
      meta: { title: 'Precurado' },
    },

    // --- Tread Type ---
    {
      id: 'tread_type',
      accessorKey: 'tread_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de banda" />,
      cell: ({ row }) => {
        const val = row.original.tread_type;
        return <div>{tireTreadTypeLabels[val] ?? val}</div>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
      meta: { title: 'Tipo de banda' },
    },

    // --- Tread Depth ---
    {
      id: 'tread_depth',
      accessorKey: 'tread_depth',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Profundidad" />,
      cell: ({ row }) => {
        const val = row.original.tread_depth;
        if (val == null) return <div className="text-muted-foreground">-</div>;
        return <div>{String(val)} mm</div>;
      },
      meta: { title: 'Profundidad (mm)' },
    },

    // --- Status ---
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        return <Badge variant={tireStatusBadges[status] ?? 'default'}>{tireStatusLabels[status] ?? status}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
      meta: { title: 'Estado' },
    },

    // --- Vehicle (current installation) ---
    {
      id: 'vehicle',
      accessorFn: (row) => row.vehicle_tire_positions?.[0]?.vehicle?.domain ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo" />,
      cell: ({ row }) => {
        const domain = row.original.vehicle_tire_positions?.[0]?.vehicle?.domain;
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
        const vehicleId = row.original.vehicle_tire_positions?.[0]?.vehicle?.id ?? null;
        if (vehicleId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(vehicleId);
      },
      enableSorting: false,
      meta: { title: 'Vehículo' },
    },

    // --- Created At ---
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de alta" />,
      cell: ({ row }) => (
        <div>{row.original.created_at ? moment(row.original.created_at).format('DD/MM/YYYY') : '-'}</div>
      ),
      meta: { title: 'Fecha de alta' },
    },

    // --- Actions ---
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            cell: ({ row }: { row: import('@tanstack/react-table').Row<TireListItem> }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdate && (
                    <DropdownMenuItem onClick={() => onEdit(row.original)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(row.original)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
            enableSorting: false,
            enableHiding: false,
            meta: { title: '', excludeFromExport: true },
          } satisfies ColumnDef<TireListItem>,
        ]
      : []),
  ];
}
