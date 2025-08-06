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
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, ColumnFiltersState, FilterFn, Row, Updater, VisibilityState } from '@tanstack/react-table';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { Trash2 } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  deleteDailyReport,
  fetchDailyReportsWithFilters,
  getDailyReports,
  getDailyReportsForCurrentMonth,
} from './actions/actions';
import { dailyReportStatus } from './utils/utils';

const dateRangeFilter: FilterFn<Awaited<ReturnType<typeof getDailyReports>>[number]> = (
  row: Row<Awaited<ReturnType<typeof getDailyReports>>[number]>,
  columnId: string,
  filterValue: { from?: Date | null; to?: Date | null },
  addMeta: (meta: any) => void
) => {
  const validityRaw = row.original.date;
  const { from, to } = filterValue || {};
  // console.log('[dateRangeFilter] row:', row);
  // console.log('[dateRangeFilter] columnId:', columnId);
  // console.log('[dateRangeFilter] filterValue:', filterValue);
  if (!validityRaw) {
    // console.log('[dateRangeFilter] No validity value, return false');
    return false;
  }
  if (validityRaw === 'No vence') {
    // console.log('[dateRangeFilter] Valor "No vence", return false');
    return false;
  }

  // Parsear la fecha del documento
  const [day, month, year] = validityRaw.split('/');
  const validityMoment = moment(`${year}-${month}-${day}`, 'YYYY-MM-DD');
  if (!validityMoment.isValid()) {
    // console.log('[dateRangeFilter] Fecha inválida:', `${year}-${month}-${day}`);
    return false;
  }
  // console.log('[dateRangeFilter] validityMoment:', validityMoment.format());

  // Comparaciones con moment
  if (from && !to) {
    const fromMoment = moment(from);
    const result = validityMoment.isSameOrAfter(fromMoment, 'day');
    // console.log(`[dateRangeFilter] Comparando >= from (${fromMoment.format('YYYY-MM-DD')}):`, result);
    return result;
  }
  if (!from && to) {
    const toMoment = moment(to);
    const result = validityMoment.isSameOrBefore(toMoment, 'day');
    // console.log(`[dateRangeFilter] Comparando <= to (${toMoment.format('YYYY-MM-DD')}):`, result);
    return result;
  }
  if (from && to) {
    const fromMoment = moment(from);
    const toMoment = moment(to);
    const result = validityMoment.isBetween(fromMoment, toMoment, 'day', '[]');

    return result;
  }
  // console.log('[dateRangeFilter] Sin from/to, return true');
  return true;
};
export const reportColumnas: ColumnDef<Awaited<ReturnType<typeof getDailyReports>>[number]>[] = [
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
          {row.original.dailyreportrows.filter((row) => row.status === 'sin_recursos_asignados').length}
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
      return <Badge>{row.original.dailyreportrows.filter((row) => row.status === 'pendiente').length}</Badge>;
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
    header: () => null, // Sin encabezado
    cell: ({ row }) => {
      const router = useRouter();
      const hasRows = row.original.dailyreportrows.length > 0;

      const handleDelete = async () => {
        toast.promise(
          async () => {
            const result = await deleteDailyReport(row.original.id);
          },
          {
            loading: 'Eliminando parte diario...',
            success: 'Parte diario eliminado correctamente',
            error: 'Error al eliminar el parte diario',
          }
        );
        router.refresh();
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
      );
    },
  },
];

function DailyReportTable({
  savedVisibility,
  savedFilter,
  dailyReports,
}: {
  savedVisibility: VisibilityState;
  savedFilter: string[];
  dailyReports: Awaited<ReturnType<typeof getDailyReportsForCurrentMonth>>;
}) {
  const statusOptions = createFilterOptions(dailyReports, (dailyReport) => dailyReport.status);
  // Estado para los datos mostrados actualmente
  const [dailyRows, setDailyRows] = useState<Awaited<ReturnType<typeof getDailyReportsForCurrentMonth>>>(dailyReports);

  // Estado para seguir los filtros actuales
  const [currentFilters, setCurrentFilters] = useState<{
    dateFrom: Date | null;
    dateTo: Date | null;
    status: string[] | null;
  }>({
    dateFrom: startOfMonth(new Date()), // Primer día del mes actual
    dateTo: endOfMonth(new Date()), // Último día del mes actual
    status: null,
  });

  // Estado para indicar carga
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDailyRows(dailyReports);
  }, [dailyReports]);

  // Función para cargar datos basados en filtros
  const fetchFilteredData = useCallback(async () => {
    try {
      // Verificar si hay filtros activos
      const hasFiltros =
        currentFilters.dateFrom !== null ||
        currentFilters.dateTo !== null ||
        (currentFilters.status !== null && currentFilters.status.length > 0);

      // Si no hay filtros activos, restaurar los datos originales
      if (!hasFiltros) {
        // setDailyRows(dailyReports);
        return;
      }
      setIsLoading(true);

      // Formatear fechas para la API
      const fromDate = currentFilters.dateFrom ? format(currentFilters.dateFrom, 'yyyy-MM-dd') : undefined;
      const toDate = currentFilters.dateTo ? format(currentFilters.dateTo, 'yyyy-MM-dd') : undefined;

      // Llamada a la API con parámetros de filtro
      const response = await fetchDailyReportsWithFilters({
        fromDate,
        toDate,
        status: currentFilters.status,
      });

      // Si obtenemos datos, actualizar el estado
      if (response && response.length > 0) {
        setDailyRows(response);
      } else {
        // Si no hay resultados con los filtros aplicados, mostrar mensaje
        // toast.info('No se encontraron registros con los filtros aplicados');
      }
    } catch (error) {
      console.error('Error al cargar los datos filtrados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, dailyReports]);

  // Efecto para cargar datos al inicio o cuando cambian los filtros
  useEffect(() => {
    fetchFilteredData();
  }, [currentFilters]);

  // Manejador para cambios en los filtros de columna
  const handleColumnFiltersChange = useCallback((updatedFilters: Updater<ColumnFiltersState>) => {
    // Convertir Updater<ColumnFiltersState> a ColumnFiltersState
    const newFilters =
      typeof updatedFilters === 'function'
        ? updatedFilters([]) // Si es una función, pasarle un array vacío (simplificado)
        : updatedFilters; // Si es un valor directo, usarlo como está
    // Extraer filtro de fecha
    const dateFilter = newFilters.find((f) => f.id === 'Fecha')?.value as
      | { from: Date | null; to: Date | null }
      | undefined;
    // Extraer filtro de estado
    const statusFilter = newFilters.find((f) => f.id === 'Estado')?.value as string[] | undefined;
    if (!dateFilter && !statusFilter) {
      setCurrentFilters({
        dateFrom: startOfMonth(new Date()),
        dateTo: endOfMonth(new Date()),
        status: null,
      });
      setDailyRows(dailyReports);
    }
    // Actualizar el estado de filtros actuales
    setCurrentFilters((prev) => ({
      dateFrom: dateFilter?.from ?? prev.dateFrom,
      dateTo: dateFilter?.to ?? prev.dateTo,
      status: statusFilter ?? prev.status,
    }));
  }, []);

  return (
    <div className="relative">
      {isLoading && (
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
        data={dailyRows}
        row_classname={(row) => (row.status === 'cerrado_incompleto' ? 'bg-red-400/30' : '')}
        savedVisibility={savedVisibility}
        onColumnFiltersChange={(data) => handleColumnFiltersChange(data)}
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
              // Valores iniciales para los datepickers
              // defaultValues: {
              //   from: currentFilters.dateFrom,
              //   to: currentFilters.dateTo,
              // },
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
