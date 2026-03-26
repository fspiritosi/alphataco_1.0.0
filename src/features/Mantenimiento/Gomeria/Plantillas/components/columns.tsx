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
import type { DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import { calculatePositions } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { CarFront, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import moment from 'moment';
import type { TemplateListItem } from '../actions/actions.server';

// ============================================================================
// TYPES
// ============================================================================

type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

// ============================================================================
// HELPERS
// ============================================================================

function computePositionCount(item: TemplateListItem): number {
  if (!item.axles || item.axles.length === 0) return 0;

  const diagramAxles: DiagramAxle[] = item.axles.map((axle) => ({
    id: axle.id,
    axle_number: axle.axle_number,
    tires_per_side: axle.tires_per_side,
    tire_size: axle.tire_size,
    is_drive_axle: axle.is_drive_axle,
    is_spare: axle.is_spare,
  }));

  return calculatePositions(diagramAxles).length;
}

// ============================================================================
// COLUMNS
// ============================================================================

export function getColumns(
  permissions: Permissions,
  onEdit: (template: TemplateListItem) => void,
  onDelete: (template: TemplateListItem) => void,
  onAssign: (template: TemplateListItem) => void
): ColumnDef<TemplateListItem>[] {
  const canUpdate = permissions.hasPermission('mantenimiento', 'plantillas_cubiertas', 'update');
  const canCreate = permissions.hasPermission('mantenimiento', 'plantillas_cubiertas', 'create');

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

    // --- Name ---
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      meta: { title: 'Nombre' },
    },

    // --- Description ---
    {
      id: 'description',
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {row.original.description ?? <span className="italic">Sin descripción</span>}
        </div>
      ),
      meta: { title: 'Descripción' },
    },

    // --- Axle Count (virtual) ---
    {
      id: 'axle_count',
      accessorFn: (row) => row._count?.axles ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ejes" />,
      cell: ({ row }) => <Badge variant="outline">{row.original._count?.axles ?? 0} ejes</Badge>,
      enableSorting: false,
      meta: { title: 'Ejes' },
    },

    // --- Position Count (virtual, computed from axles) ---
    {
      id: 'position_count',
      accessorFn: (row) => computePositionCount(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Posiciones" />,
      cell: ({ row }) => {
        const count = computePositionCount(row.original);
        return <Badge variant="secondary">{count} posiciones</Badge>;
      },
      enableSorting: false,
      meta: { title: 'Posiciones' },
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
    ...(canUpdate || canCreate
      ? [
          {
            id: 'actions',
            cell: ({ row }: { row: import('@tanstack/react-table').Row<TemplateListItem> }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canCreate && (
                    <DropdownMenuItem onClick={() => onAssign(row.original)}>
                      <CarFront className="mr-2 h-4 w-4" />
                      Asignar a subtipo
                    </DropdownMenuItem>
                  )}
                  {canUpdate && (
                    <DropdownMenuItem onClick={() => onEdit(row.original)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canUpdate && (
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
          } satisfies ColumnDef<TemplateListItem>,
        ]
      : []),
  ];
}
