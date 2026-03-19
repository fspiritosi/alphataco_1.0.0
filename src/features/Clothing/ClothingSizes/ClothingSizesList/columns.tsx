'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, MoreHorizontal, Pencil, X } from 'lucide-react';
import moment from 'moment';
import type { ClothingSizeListItem } from './actions.server';

// ============================================================================
// TYPES
// ============================================================================

type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

type ColumnCallbacks = {
  onEdit: (size: ClothingSizeListItem) => void;
  onToggleActive: (size: ClothingSizeListItem) => void;
};

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT = ['created_at'];

// ============================================================================
// COLUMNS FACTORY
// ============================================================================

export function getColumns(permissions: Permissions, callbacks: ColumnCallbacks): ColumnDef<ClothingSizeListItem>[] {
  const canUpdate = permissions.hasPermission('empresa', 'talles_indumentaria', 'update');
  const canDelete = permissions.hasPermission('empresa', 'talles_indumentaria', 'delete');

  return [
    // ── Nombre ──────────────────────────────────────────────────────────────
    {
      accessorKey: 'name',
      id: 'name',
      meta: { title: 'Nombre' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },

    // ── Estado (boolean) ─────────────────────────────────────────────────────
    {
      accessorKey: 'is_active',
      id: 'is_active',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            Activo
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Inactivo
          </Badge>
        ),
      filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    },

    // ── Fecha de creación (oculta por defecto) ───────────────────────────────
    {
      accessorKey: 'created_at',
      id: 'created_at',
      meta: { title: 'Fecha de creación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de creación" />,
      cell: ({ row }) =>
        row.original.created_at ? <span>{moment(row.original.created_at).format('DD/MM/YYYY')}</span> : <span>-</span>,
    },

    // ── Acciones ─────────────────────────────────────────────────────────────
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            meta: { excludeFromExport: true, title: '' },
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }: { row: { original: ClothingSizeListItem } }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdate && (
                    <DropdownMenuItem onClick={() => callbacks.onEdit(row.original)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={() => callbacks.onToggleActive(row.original)}>
                      {row.original.is_active ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColumnDef<ClothingSizeListItem>,
        ]
      : []),
  ];
}
