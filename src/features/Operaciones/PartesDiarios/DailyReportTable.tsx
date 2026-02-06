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
import { Button, buttonVariants } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { PermissionGuard } from '@/features/Permissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, ColumnFiltersState, FilterFn, Row, Updater, VisibilityState } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { deleteDailyReport, fetchDailyReportsWithFilters } from './actions/actions';
import { DAILY_REPORTS_QUERY_KEY, DailyReportType, useDailyReports } from './hooks/useDailyReports';
import { dailyReportStatus } from './utils/utils';

// Pass-through: el filtro de fechas se aplica en el servidor
const dateRangeFilter: FilterFn<DailyReportType> = () => true;

function DeleteDailyReportCell({ row }: { row: Row<DailyReportType> }) {
  const queryClient = useQueryClient();
  const hasRows = row.original.dailyreportrows.length > 0;

  const handleDelete = async () => {
    toast.promise(
      async () => {
        await deleteDailyReport(row.original.id);
        queryClient.invalidateQueries({ queryKey: [...DAILY_REPORTS_QUERY_KEY] });
      },
      {
        loading: 'Eliminando parte diario...',
        success: 'Parte diario eliminado correctamente',
        error: 'Error al eliminar el parte diario',
      }
    );
  };

  return (
    <PermissionGuard module="operaciones" tab="dailyreportstable" action="delete">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={hasRows}
            title={hasRows ? 'No se puede eliminar un parte con registros' : 'Eliminar parte diario'}
          >
            <Trash2 className={hasRows ? 'text-gray-400' : 'text-red-500'} size={16} />
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
    </PermissionGuard>
  );
}

const reportColumnas: ColumnDef<DailyReportType>[] = [
  {
    accessorKey: 'date',
    id: 'Fecha',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de parte diario" />,
    cell: ({ row }) => <span className="font-medium">{moment(row.original.date).format('DD/MM/YYYY')}</span>,
    filterFn: dateRangeFilter,
  },
  {
    accessorKey: 'status',
    id: 'Estado',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      return <Badge variant={dailyReportStatus[row.original.status]}>{row.original.status.replaceAll('_', ' ')}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'Sin Recursos',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sin Recursos" />,
    cell: ({ row }) => {
      return (
        <Badge variant={'warning'}>
          {row.original.dailyreportrows.filter((r) => r.status === 'sin_recursos_asignados').length}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'Pendientes',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Pendientes" />,
    cell: ({ row }) => {
      return <Badge>{row.original.dailyreportrows.filter((r) => r.status === 'pendiente').length}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'Total',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => {
      return <Badge>{row.original.dailyreportrows.length}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'actions',
    header: 'Acciones',
    id: 'Acciones',
    cell: ({ row }) => (
      <Link className={buttonVariants({ variant: 'outline' })} href={`/dashboard/operations/${row.original.id}`}>
        Ver completo
      </Link>
    ),
  },
  {
    id: 'delete',
    header: () => null,
    cell: ({ row }) => <DeleteDailyReportCell row={row} />,
  },
];

function DailyReportTable({
  savedVisibility,
  savedFilter,
  initialData,
}: {
  savedVisibility: VisibilityState;
  savedFilter: string[];
  initialData: Awaited<ReturnType<typeof fetchDailyReportsWithFilters>>;
}) {
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: moment().startOf('month').toDate(),
    to: moment().endOf('month').toDate(),
  });

  const fromDate = dateRange.from ? moment(dateRange.from).format('YYYY-MM-DD') : undefined;
  const toDate = dateRange.to ? moment(dateRange.to).format('YYYY-MM-DD') : undefined;

  const { data: dailyRows, isFetching } = useDailyReports({
    fromDate,
    toDate,
    initialData,
  });

  const statusOptions = useMemo(
    () => createFilterOptions(dailyRows || [], (dailyReport) => dailyReport.status),
    [dailyRows]
  );

  const handleColumnFiltersChange = useCallback((updater: Updater<ColumnFiltersState>) => {
    const newFilters = typeof updater === 'function' ? updater([]) : updater;
    const dateFilter = newFilters.find((f) => f.id === 'Fecha')?.value as
      | { from: Date | null; to: Date | null }
      | undefined;

    if (dateFilter) {
      setDateRange(dateFilter);
    } else {
      // Si no hay filtro de fecha activo, resetear al mes actual
      setDateRange({
        from: moment().startOf('month').toDate(),
        to: moment().endOf('month').toDate(),
      });
    }
  }, []);

  return (
    <div className="relative">
      {isFetching && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-md shadow-md">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">Cargando...</span>
          </div>
        </div>
      )}

      <BaseDataTable
        tableId="dailyReportTable"
        columns={reportColumnas}
        data={dailyRows || []}
        row_classname={(row) => (row.status === 'cerrado_incompleto' ? 'bg-red-400/30' : '')}
        savedVisibility={savedVisibility}
        onColumnFiltersChange={handleColumnFiltersChange}
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],
          filterableColumns: [
            {
              columnId: 'Fecha',
              title: 'Fecha',
              type: 'date-range',
              fromPlaceholder: 'Desde (Fecha)',
              toPlaceholder: 'Hasta (Fecha)',
              showFrom: true,
              showTo: true,
            },
            {
              columnId: 'Estado',
              title: 'Estado',
              options: statusOptions,
            },
          ],
        }}
      />
    </div>
  );
}

export default DailyReportTable;
