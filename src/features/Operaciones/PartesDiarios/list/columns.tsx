'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { dailyReportStatusBadges, dailyReportStatusLabels } from '@/shared/utils/mappers';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Trash2 } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { toast } from 'sonner';
import { deleteDailyReport } from '../actions/mutations.server';
import { DAILY_REPORTS_QUERY_KEY } from '../hooks/useDailyReports';
import type { DailyReportListItem } from './actions.server';

// Columnas ocultas por defecto (visibilidad inicial)
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['creation_date'];

// Tipo de permisos recibidos desde el servidor
type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

// ── Cell de eliminación con confirmación ──────────────────────────────────────
function DeleteDailyReportCell({ row }: { row: { original: DailyReportListItem } }) {
  const queryClient = useQueryClient();
  const hasRows = row.original.dailyreportrows.length > 0;

  const handleDelete = async () => {
    toast.promise(
      async () => {
        await deleteDailyReport(row.original.id);
        queryClient.invalidateQueries({ queryKey: [...DAILY_REPORTS_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: ['daily-reports-list-facets'] });
      },
      {
        loading: 'Eliminando parte diario...',
        success: 'Parte diario eliminado correctamente',
        error: 'Error al eliminar el parte diario',
      }
    );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={hasRows}
          title={hasRows ? 'No se puede eliminar un parte con registros' : 'Eliminar parte diario'}
        >
          <Trash2 className={hasRows ? 'h-4 w-4 text-gray-400' : 'h-4 w-4 text-red-500'} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro de eliminar este parte diario?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El parte diario será eliminado permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Definición de columnas ────────────────────────────────────────────────────
export function getColumns(permissions: Permissions): ColumnDef<DailyReportListItem>[] {
  const canDelete = permissions.hasPermission('operaciones', 'dailyreportstable', 'delete');

  return [
    // ── Fecha del parte diario ──────────────────────────────────────────────
    {
      accessorKey: 'date',
      meta: { title: 'Fecha' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">{moment.utc(row.original.date).format('DD/MM/YYYY')}</span>
      ),
    },

    // ── Estado del parte diario (enum) ─────────────────────────────────────
    {
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const label = dailyReportStatusLabels[status] ?? status.replaceAll('_', ' ');
        const variant = dailyReportStatusBadges[status] ?? 'default';
        return (
          <Badge variant={variant} className="whitespace-nowrap">
            {label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    },

    // ── Fecha de creación (oculta por defecto) ─────────────────────────────
    {
      accessorKey: 'creation_date',
      meta: { title: 'Fecha de creación' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de creación" />,
      cell: ({ row }) => (
        <span>{row.original.creation_date ? moment.utc(row.original.creation_date).format('DD/MM/YYYY') : '—'}</span>
      ),
    },

    // ── Sin Recursos (virtual — count de rows con status sin_recursos_asignados) ─
    {
      id: 'sin_recursos',
      meta: { title: 'Sin Recursos', excludeFromExport: true },
      enableSorting: false,
      accessorFn: (row) => row.dailyreportrows.filter((r) => r.status === 'sin_recursos_asignados').length,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sin Recursos" />,
      cell: ({ row }) => {
        const count = row.original.dailyreportrows.filter((r) => r.status === 'sin_recursos_asignados').length;
        return (
          <Badge variant={count > 0 ? 'warning' : 'secondary'} className="min-w-[28px] justify-center">
            {count}
          </Badge>
        );
      },
    },

    // ── Pendientes (virtual — count de rows con status pendiente) ──────────
    {
      id: 'pendientes',
      meta: { title: 'Pendientes', excludeFromExport: true },
      enableSorting: false,
      accessorFn: (row) => row.dailyreportrows.filter((r) => r.status === 'pendiente').length,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pendientes" />,
      cell: ({ row }) => {
        const count = row.original.dailyreportrows.filter((r) => r.status === 'pendiente').length;
        return (
          <Badge variant={count > 0 ? 'default' : 'secondary'} className="min-w-[28px] justify-center">
            {count}
          </Badge>
        );
      },
    },

    // ── Total (virtual — count total de dailyreportrows) ───────────────────
    {
      id: 'total',
      meta: { title: 'Total', excludeFromExport: true },
      enableSorting: false,
      accessorFn: (row) => row.dailyreportrows.length,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const count = row.original.dailyreportrows.length;
        return (
          <Badge variant="outline" className="min-w-[28px] justify-center">
            {count}
          </Badge>
        );
      },
    },

    // ── is_active (oculto por defecto) ─────────────────────────────────────
    {
      accessorKey: 'is_active',
      meta: { title: 'Activo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Activo" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id);
        if (val == null) return value.includes('true');
        return value.includes(String(val));
      },
    },

    // ── Acciones (ver + eliminar) ──────────────────────────────────────────
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/operations/${row.original.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver
          </Link>
          {canDelete && <DeleteDailyReportCell row={row} />}
        </div>
      ),
    },
  ];
}
