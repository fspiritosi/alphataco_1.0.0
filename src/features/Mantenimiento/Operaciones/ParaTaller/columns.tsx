'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels } from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, History } from 'lucide-react';
import moment from 'moment';
import type { ForWorkshopOrderListItem } from './actions.server';
export { conditionLabels };

// ============================================================================
// LABELS Y CONFIGS
// ============================================================================

export const conditionVariants: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  operativo: 'success',
  no_operativo: 'destructive',
  en_reparacion: 'destructive',
  operativo_condicionado: 'warning',
  en_preparacion: 'secondary',
};

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['created_at', 'order_number'];

// ============================================================================
// COLUMNS FACTORY
// ============================================================================

interface ColumnsProps {
  onViewDetail: (order: ForWorkshopOrderListItem) => void;
  onViewHistory: (order: ForWorkshopOrderListItem) => void;
}

export function getForWorkshopColumns({
  onViewDetail,
  onViewHistory,
}: ColumnsProps): ColumnDef<ForWorkshopOrderListItem>[] {
  return [
    // ── Equipo ────────────────────────────────────────────────────────────
    {
      id: 'vehicle',
      accessorFn: (row) => {
        const v = row.vehicles;
        return v?.domain || v?.serie || v?.intern_number || '';
      },
      meta: { title: 'Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{vehicle?.domain || vehicle?.serie || 'Sin identificar'}</span>
            {vehicle?.intern_number && <span className="text-xs text-muted-foreground">#{vehicle.intern_number}</span>}
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.equipment_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Items ──────────────────────────────────────────────────────────────
    {
      id: 'items_count',
      accessorFn: (row) => row.maintenance_order_items?.length ?? 0,
      meta: { title: 'Items' },
      header: 'Items',
      cell: ({ row }) => {
        const count = row.original.maintenance_order_items?.length ?? 0;
        return (
          <Badge variant="secondary">
            {count} {count === 1 ? 'item' : 'items'}
          </Badge>
        );
      },
      enableSorting: false,
    },

    // ── Fecha Planificada ──────────────────────────────────────────────────
    {
      id: 'scheduled_date',
      accessorKey: 'scheduled_date',
      meta: { title: 'Fecha Planificada' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Planificada" />,
      cell: ({ row }) => {
        const date = row.original.scheduled_date;
        if (!date) return <span className="text-muted-foreground">-</span>;

        const scheduledDate = moment(date);
        const today = moment().startOf('day');
        const isToday = scheduledDate.isSame(today, 'day');
        const isPast = scheduledDate.isBefore(today);
        const isTomorrow = scheduledDate.isSame(today.clone().add(1, 'day'), 'day');

        return (
          <div className="flex flex-col">
            <span
              className={
                isToday ? 'font-bold text-green-600' : isPast ? 'text-red-600' : isTomorrow ? 'text-orange-600' : ''
              }
            >
              {scheduledDate.format('DD/MM/YYYY')}
            </span>
            {isToday && <span className="text-xs text-green-600">Hoy</span>}
            {isPast && <span className="text-xs text-red-600">Vencido</span>}
            {isTomorrow && <span className="text-xs text-orange-600">Mañana</span>}
          </div>
        );
      },
    },

    // ── Condición del vehículo ──────────────────────────────────────────────
    {
      id: 'condition',
      accessorFn: (row) => row.vehicles?.condition ?? null,
      meta: { title: 'Condición Actual' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición Actual" />,
      cell: ({ row }) => {
        const condition = row.original.vehicles?.condition;
        const label = condition ? conditionLabels[condition] ?? condition : 'Sin datos';
        const variant = condition ? conditionVariants[condition] ?? 'secondary' : 'secondary';
        return <Badge variant={variant}>{label}</Badge>;
      },
      enableSorting: false,
      filterFn: (row, _id, value: string[]) => {
        const cond = row.original.vehicles?.condition;
        if (cond == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(cond);
      },
    },

    // ── Kilometraje ────────────────────────────────────────────────────────
    {
      id: 'kilometer',
      accessorFn: (row) => row.vehicles?.kilometer ?? null,
      meta: { title: 'Km Actual' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Km Actual" />,
      cell: ({ row }) => {
        const km = row.original.vehicles?.kilometer;
        if (!km) return <span className="text-muted-foreground">-</span>;
        return <span>{Number(km).toLocaleString('es-AR')} km</span>;
      },
      enableSorting: false,
    },

    // ── N° de pedido (oculta por defecto) ─────────────────────────────────
    {
      id: 'order_number',
      accessorKey: 'order_number',
      meta: { title: 'N° Pedido' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Pedido" />,
      cell: ({ row }) => row.original.order_number ?? <span className="text-muted-foreground">-</span>,
    },

    // ── Fecha de creación (oculta por defecto) ─────────────────────────────
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha de Creación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Creación" />,
      cell: ({ row }) => {
        const date = row.original.created_at;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return <span>{moment(date).format('DD/MM/YYYY')}</span>;
      },
    },

    // ── Acciones ────────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onViewDetail(order)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewHistory(order)}
              title="Ver historial"
              className="text-purple-600 hover:text-purple-700"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
