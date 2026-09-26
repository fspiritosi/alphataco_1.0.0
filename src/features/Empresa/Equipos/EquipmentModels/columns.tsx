'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { EquipmentModelListItem } from './actions.server';

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['created_at'];

// ============================================================================
// PERMISSIONS TYPE
// ============================================================================

type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

// ============================================================================
// COLUMNS
// ============================================================================

export function getColumns(
  permissions: Permissions,
  onEdit: (item: EquipmentModelListItem) => void
): ColumnDef<EquipmentModelListItem>[] {
  const canUpdate = permissions.hasPermission('configuracion', 'modelos', 'update');

  return [
    // ── Nombre ──────────────────────────────────────────────────────────────
    {
      accessorKey: 'name',
      meta: { title: 'Nombre' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name ?? '-'}</span>,
      // filterFn no necesario para filtros text
    },

    // ── Marca (FK BigInt a brand_vehicles) ───────────────────────────────────
    {
      id: 'brand',
      accessorFn: (row) => row.brand_vehicles?.name ?? '',
      meta: { title: 'Marca' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => {
        const brandName = row.original.brand_vehicles?.name;
        if (!brandName) {
          return <span className="text-muted-foreground italic">Sin marca</span>;
        }
        return <span>{brandName}</span>;
      },
      filterFn: (row, _id, value: string[]) => {
        const brandId = row.original.brand;
        if (brandId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(brandId));
      },
      // enableSorting: true por defecto — FK_SORT_MAP en actions.server.ts resuelve el orderBy
    },

    // ── Estado (is_active — booleano nullable) ───────────────────────────────
    {
      accessorKey: 'is_active',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const val = row.original.is_active;
        if (val === null || val === undefined) {
          return <Badge variant="default">Sin asignar</Badge>;
        }
        return <Badge variant={val ? 'success' : 'secondary'}>{val ? 'Activo' : 'Inactivo'}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id);
        if (val === null || val === undefined) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(val));
      },
    },

    // ── Fecha de creación (oculta por defecto) ────────────────────────────────
    {
      accessorKey: 'created_at',
      meta: { title: 'Fecha de creación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de creación" />,
      cell: ({ row }) => {
        const val = row.original.created_at;
        return <span>{val ? moment(val).format('DD/MM/YYYY') : '-'}</span>;
      },
    },

    // ── Acciones ─────────────────────────────────────────────────────────────
    ...(canUpdate
      ? ([
          {
            id: 'actions',
            meta: { title: '', excludeFromExport: true },
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
              <Button
                size="sm"
                variant="link"
                className="hover:text-blue-400 p-0 h-auto"
                onClick={() => onEdit(row.original)}
              >
                Editar
              </Button>
            ),
          },
        ] as ColumnDef<EquipmentModelListItem>[])
      : []),
  ];
}
