'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { ColumnDef } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import moment from 'moment';
import type { OrderManagementListItem } from './actions.server';

// ============================================================================
// TYPES
// ============================================================================

interface ColumnsProps {
  onManage: (order: OrderManagementListItem) => void;
}

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'created_at',
  'domain',
  'serie',
  'intern_number',
];

// ============================================================================
// COLUMNS DEFINITION
// ============================================================================

export function getOrderManagementColumns({ onManage }: ColumnsProps): ColumnDef<OrderManagementListItem>[] {
  return [
    // ── N° Orden ──────────────────────────────────────────────────────────
    {
      accessorKey: 'order_number',
      id: 'order_number',
      meta: { title: 'N° Orden' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.order_number || '-'}</span>
      ),
    },

    // ── Equipo (FK: vehicles, filtra por ID) ──────────────────────────────
    {
      id: 'vehicle',
      accessorFn: (row) => {
        const v = row.vehicles;
        return v?.domain ?? v?.serie ?? '';
      },
      meta: { title: 'Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        const display = vehicle?.domain ?? vehicle?.serie ?? '-';
        const internNumber = vehicle?.intern_number;
        return (
          <div>
            <span className="font-medium">{display}</span>
            {internNumber && (
              <span className="text-muted-foreground ml-1 text-xs">({internNumber})</span>
            )}
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.vehicles?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Tipo de Vehículo (FK BigInt anidado: vehicles.types_of_vehicles) ──
    {
      id: 'vehicleType',
      accessorFn: (row) => row.vehicles?.types_of_vehicles?.name ?? '',
      meta: { title: 'Tipo de Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Equipo" />,
      cell: ({ row }) => {
        const typeName = row.original.vehicles?.types_of_vehicles?.name;
        return <span>{typeName ?? '-'}</span>;
      },
      filterFn: (row, _id, value: string[]) => {
        const typeId = row.original.vehicles?.types_of_vehicles?.id;
        if (typeId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(typeId));
      },
    },

    // ── Fecha Ingreso ─────────────────────────────────────────────────────
    {
      accessorKey: 'workshop_entry_date',
      id: 'workshop_entry_date',
      meta: { title: 'Ingreso al Taller' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ingreso al Taller" />,
      cell: ({ row }) => {
        const date = row.original.workshop_entry_date;
        return <span>{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
    },

    // ── Items (conteo: asignados / total, columna virtual) ────────────────
    {
      id: 'items',
      meta: { title: 'Items' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items.filter((i) => !i.is_diagnostico);
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

    // ── Sectores (virtual: M:M a través de items) ─────────────────────────
    {
      id: 'sectors',
      meta: { title: 'Sectores' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sectores" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items;
        const sectorNames = new Set<string>();
        items.forEach((item) => {
          if (item.workshop_sectors?.name) {
            sectorNames.add(item.workshop_sectors.name);
          }
        });
        if (sectorNames.size === 0) {
          return <Badge variant="outline">Sin asignar</Badge>;
        }
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

    // ── Fecha Creación (oculto por defecto) ───────────────────────────────
    {
      accessorKey: 'created_at',
      id: 'created_at',
      meta: { title: 'Fecha Creación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Creación" />,
      cell: ({ row }) => {
        const date = row.original.created_at;
        return <span>{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
    },

    // ── Dominio (texto en vehicles, oculto por defecto) ───────────────────
    {
      id: 'domain',
      accessorFn: (row) => row.vehicles?.domain ?? '',
      meta: { title: 'Dominio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
      cell: ({ row }) => <span>{row.original.vehicles?.domain ?? '-'}</span>,
      enableSorting: false,
    },

    // ── Serie (texto en vehicles, oculto por defecto) ─────────────────────
    {
      id: 'serie',
      accessorFn: (row) => row.vehicles?.serie ?? '',
      meta: { title: 'Serie' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
      cell: ({ row }) => <span>{row.original.vehicles?.serie ?? '-'}</span>,
      enableSorting: false,
    },

    // ── N° Interno (texto en vehicles, oculto por defecto) ────────────────
    {
      id: 'intern_number',
      accessorFn: (row) => row.vehicles?.intern_number ?? '',
      meta: { title: 'N° Interno' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Interno" />,
      cell: ({ row }) => <span>{row.original.vehicles?.intern_number ?? '-'}</span>,
      enableSorting: false,
    },

    // ── Acciones ──────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onManage(row.original)}>
          <Settings2 className="mr-1 h-4 w-4" />
          Gestionar
        </Button>
      ),
    },
  ];
}
