'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { EquipmentOwnerListItem } from './actions.server';

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
// COLUMNS — Tabla principal de titulares
// ============================================================================

export function getEquipmentOwnerColumns(
  permissions: Permissions,
  onEdit: (item: EquipmentOwnerListItem) => void,
  onViewEquipment: (item: EquipmentOwnerListItem) => void
): ColumnDef<EquipmentOwnerListItem>[] {
  const canUpdate = permissions.hasPermission('empresa', 'titulares', 'update');

  return [
    // ── Nombre ──────────────────────────────────────────────────────────────
    {
      accessorKey: 'name',
      meta: { title: 'Nombre' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name ?? '-'}</span>,
    },

    // ── CUIT ────────────────────────────────────────────────────────────────
    {
      accessorKey: 'cuit',
      meta: { title: 'CUIT' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="CUIT" />,
      cell: ({ row }) => <span className="font-mono">{row.original.cuit ?? '-'}</span>,
    },

    // ── Tipos de Contrato (M:M) ──────────────────────────────────────────────
    {
      id: 'contractTypes',
      accessorFn: (row) => row.equipment_owner_contract_types?.map((ct) => ct.contract_type).join(', ') ?? '',
      meta: { title: 'Tipos de Contrato' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos de Contrato" />,
      cell: ({ row }) => {
        const types = row.original.equipment_owner_contract_types ?? [];
        if (types.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((ct) => (
              <Badge key={ct.id} variant="outline">
                {ct.contract_type}
              </Badge>
            ))}
          </div>
        );
      },
      enableSorting: false,
    },

    // ── Estado (is_active — booleano nullable) ────────────────────────────────
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
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Button
              size="sm"
              variant="link"
              className="hover:text-blue-400 p-0 h-auto"
              onClick={() => onEdit(row.original)}
            >
              Editar
            </Button>
          )}
          <Button
            size="sm"
            variant="link"
            className="hover:text-green-600 p-0 h-auto"
            onClick={() => onViewEquipment(row.original)}
          >
            Ver Equipos
          </Button>
        </div>
      ),
    },
  ];
}
