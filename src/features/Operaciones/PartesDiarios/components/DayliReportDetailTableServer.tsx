'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { useDailyReportFormStore } from '@/stores/dailyReportFormStore';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Edit, Info, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { getDailyReportById } from '../actions/actions';
import { fetchAllDailyReportData } from '../actions/server-actions';
import {
  DailyReportRowCombined,
  useDailyReportDetailData,
  useInvalidateDailyReportDetail,
} from '../hooks/useDailyReportDetailData';
import { useFormData } from '../hooks/useFormData';
import { useValidationData } from '../hooks/useValidationData';
import { formatDailyReportData, formatDailyReportRow } from '../utils/formatDailyReportData';
import { BulkEditModal } from './BulkEditModal';
import { ClonarRegistrosButton } from './ClonarRegistrosButton';
import { DailyReportForm } from './DailyReportRowForm';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import HistoryModal from './HistoryModal';
import { ServiceDetailModal } from './ServiceDetailModal';

// Tipo extendido para columnas con propiedades adicionales de exportación
type ExtendedColumnDef<TData> = ColumnDef<TData> & {
  exportFormatter?: (value: any, row: TData) => string;
  excludeFromExport?: boolean;
};

// Usar el tipo combinado del hook para la tabla client-side
// Usamos 'any' para flexibilidad de tipos entre las diferentes fuentes de datos
type DailyReportServerData = DailyReportRowCombined;

export default function DayliReportDetailTableServer({
  dailyReportId,
  reportDate,
  savedFilters,
  savedVisibility,
  dailyReport,
  canEdit = false,
}: {
  dailyReportId: string;
  reportDate: string;
  savedFilters: string[];
  savedVisibility: VisibilityState;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  canEdit?: boolean;
}) {
  // Estado para controlar la apertura del modal de edición masiva
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DailyReportServerData[]>([]);

  // selectedRow ahora se maneja en el store de Zustand

  // Hook para cargar datos client-side con queries separadas
  const {
    data: tableData,
    isLoading: isLoadingRows,
    isLoadingEmployees,
    isLoadingEquipment,
    refetchAll,
  } = useDailyReportDetailData(dailyReportId);

  // Hook para invalidar queries
  const { invalidate: invalidateDailyReport } = useInvalidateDailyReportDetail();

  // Estado para datos transformados (para DailyReportForm y ClonarRegistrosButton)
  const [formattedData, setFormattedData] = useState<any[]>([]);

  // Hook de validacion via RPC: una sola query SQL devuelve todos los desvíos
  const {
    isLoading: loadingValidations,
    getEmployeeDeviation,
    getEquipmentDeviation,
  } = useValidationData(dailyReportId, reportDate);

  // Hook para datos del formulario (empleados completos, equipos, otros equipos y clientes)
  const { employees, equipments, otherEquipments, customers, isLoading: isLoadingFormData } = useFormData(reportDate);

  // Función para refrescar los datos usando el nuevo sistema de queries
  const refetchDailyReport = useCallback(async () => {
    await invalidateDailyReport(dailyReportId);
  }, [invalidateDailyReport, dailyReportId]);

  // Función para manejar la edición de una fila
  const handleEditRow = useCallback(
    (row: DailyReportServerData) => {
      // Formatear la fila directamente usando la función utilitaria
      const transformedRow = formatDailyReportRow(row as any, reportDate);

      // Abrir modal con el store (el customer se resolverá en el form cuando customers cargue)
      useDailyReportFormStore.getState().openModalWithRow(transformedRow);

      // Abrir el modal físicamente
      document.getElementById('open-button-daily-report')?.click();
    },
    [reportDate]
  );

  // Transformar datos al formato esperado por DailyReportForm y ClonarRegistrosButton
  useEffect(() => {
    if (tableData && tableData.length > 0) {
      const transformed = formatDailyReportData(tableData as any, reportDate);
      setFormattedData(transformed);
    }
  }, [tableData, reportDate]);

  // Función wrapper para la exportación que devuelve solo los datos
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllDailyReportData({
      dailyReportId,
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    });

    // Devolver los datos del servidor directamente sin transformar
    return result;
  };

  // Obtener TODOS los datos transformados para clonación
  const fetchAllFormattedData = async () => {
    const allData = await fetchAllDailyReportData({
      dailyReportId,
      sorting: [],
      columnFilters: [],
    });
    // Transformar todos los datos al formato esperado por ClonarRegistrosButton
    const transformed =
      allData?.map((row) => ({
        id: row.id,
        date: reportDate,
        type_service: row.type_service,
        customer: row.customers?.name,
        preparte: row.preparte,
        last_comercial_edit_at: row.last_comercial_edit_at,
        cancel_reason: row.cancel_reason,
        employees:
          row.dailyreportemployeerelations?.map((rel) => `${rel.employees?.lastname} ${rel.employees?.firstname}`) ||
          [],
        equipment:
          row.dailyreportequipmentrelations
            ?.filter((rel) => rel.equipment_id !== null)
            .map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number)
            .filter(Boolean) || [],
        customer_equipment:
          row.dailyreport_customer_equipment_relations?.map((rel) => ({
            name: rel.equipos_clientes?.name,
            type: rel.equipos_clientes?.type,
            id: rel.equipos_clientes?.id,
            relacion_id: rel.id,
          })) || [],
        services: row.customer_services?.service_name,
        item: row.service_items?.item_name,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status,
        working_day: row.working_day,
        sector_customer_id: row.service_sectors?.id,
        sector_service_name: row.service_sectors?.sectors?.name,
        completed_night: row.completed_night as boolean,
        completed_day: row.completed_day as boolean,
        areas_customer_id: row.service_areas?.id,
        areas_customer_name: row.service_areas?.areas_cliente?.descripcion_corta,
        description: row.description || '',
        document_path: row.document_path,
        remit_number: row.remit_number,
        employees_references:
          row.dailyreportemployeerelations?.map((rel) => ({
            ...rel.employees,
            name: `${rel.employees?.lastname} ${rel.employees?.firstname}`,
            id: rel.employees?.id,
            role: rel.role, // Include role for 12/24 hour shifts
          })) || [],
        equipment_references:
          row.dailyreportequipmentrelations
            ?.filter((rel) => rel.equipment_id !== null)
            .map((rel) => ({
              ...rel.vehicles,
              name: rel.vehicles?.domain || rel.vehicles?.intern_number,
              id: rel.vehicles?.id,
              brand_vehicles: rel.vehicles?.brand_vehicles?.name,
            })) || [],
        other_equipment_references:
          row.dailyreportequipmentrelations
            ?.filter((rel) => rel.other_equipment_id !== null)
            .map((rel) => ({
              ...rel.other_equipment,
              name: rel.other_equipment?.intern_number || rel.other_equipment?.serial_number,
              id: rel.other_equipment?.id,
            })) || [],
        data_to_clone: {
          customer_id: row.customers?.id,
          service_id: row.customer_services?.id,
          item_id: row.service_items?.id,
          working_day: row.working_day,
          start_time: row.start_time,
          end_time: row.end_time,
          description: row.description,
          type_service: row.type_service,
          areas_service_id: row.areas_service_id,
          sector_service_id: row.sector_service_id,
        },
      })) || [];

    return transformed;
  };

  // Función reutilizable para renderizar un badge de empleado con desvíos de la RPC
  const renderEmployeeBadge = (
    employeeName: string,
    employeeId: string | undefined,
    rowId: string,
    key?: string | number
  ) => {
    const deviation = employeeId ? getEmployeeDeviation(employeeId, rowId) : null;

    const isDuplicated = deviation?.is_duplicated ?? false;
    const isUnassigned = deviation?.is_unassigned_to_client ?? false;
    const hasNoDiagram = deviation?.has_no_diagram ?? false;
    const hasNonWorkDay = deviation?.is_non_work_day ?? false;
    const diagramTypeName = deviation?.diagram_type_name ?? null;

    // Determinar estilo principal del badge
    let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
    let badgeClassName = 'select-none text-nowrap';

    const hasBothDeviations = isUnassigned && hasNoDiagram;

    if (loadingValidations) {
      badgeVariant = 'secondary';
      badgeClassName = cn(badgeClassName, 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400');
    } else if (isDuplicated || isUnassigned || hasNoDiagram || hasNonWorkDay) {
      badgeVariant = 'outline';
      // Prioridad visual: duplicado > ambos desvíos (violeta) > no asignado > sin diagrama > día no laboral
      if (isDuplicated) {
        badgeClassName = cn(
          badgeClassName,
          'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400'
        );
      } else if (hasBothDeviations) {
        badgeClassName = cn(
          badgeClassName,
          'border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-400'
        );
      } else if (isUnassigned) {
        badgeClassName = cn(
          badgeClassName,
          'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
        );
      } else if (hasNoDiagram) {
        badgeClassName = cn(
          badgeClassName,
          'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-400'
        );
      } else {
        badgeClassName = cn(
          badgeClassName,
          'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-400'
        );
      }
    } else {
      badgeClassName = cn(badgeClassName, 'dark:text-black');
    }

    // Construir lista de mensajes de tooltip
    const tooltipMessages: string[] = [];
    if (loadingValidations) {
      tooltipMessages.push('Validando asignaciones...');
    } else {
      if (isDuplicated) tooltipMessages.push('Empleado asignado en múltiples filas');
      if (isUnassigned) tooltipMessages.push('No asignado al cliente de esta fila');
      if (hasNoDiagram) tooltipMessages.push('Sin diagrama cargado para este día');
      if (hasNonWorkDay) tooltipMessages.push(`Día no laboral: ${diagramTypeName || 'No laboral'}`);
      if (tooltipMessages.length === 0) tooltipMessages.push('Empleado asignado correctamente');
    }

    return (
      <TooltipProvider key={key} delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={badgeVariant} className={badgeClassName}>
              {employeeName}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {tooltipMessages.map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Definición de columnas
  const columns: ExtendedColumnDef<DailyReportServerData>[] = [
    // Columna de checkbox solo si tiene permiso de editar
    ...(canEdit
      ? [
          {
            id: 'select',
            header: ({ table }) => (
              <div className="w-[20px]">
                <Checkbox
                  disabled={table.getRowModel().rows.every((row) => !row.getCanSelect())}
                  checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                  aria-label="Select all"
                  className="translate-y-[2px]"
                />
              </div>
            ),
            cell: ({ row }) => (
              <Checkbox
                disabled={!row.getCanSelect()}
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
              />
            ),
            enableSorting: false,
            enableHiding: false,
            excludeFromExport: true,
          } as ExtendedColumnDef<DailyReportServerData>,
        ]
      : []),
    {
      accessorKey: 'customers.name',
      id: 'customers.name',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium select-none text-nowrap">{row.original.customers?.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.customers?.name || '';
      },
    },
    {
      accessorKey: 'customer_services.service_name',
      id: 'customer_services.service_name',
      header: ({ column, table }) => (
        <DataTableColumnHeader className="w-[130px]" column={column} table={table} title="Servicio" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.customer_services?.service_name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.customer_services?.service_name || '';
      },
    },
    {
      accessorKey: 'service_items.item_name',
      id: 'service_items.item_name',
      header: ({ column, table }) => (
        <DataTableColumnHeader className="w-[130px]" column={column} table={table} title="Item" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.service_items?.item_name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.service_items?.item_name || '';
      },
    },
    {
      accessorKey: 'service_sectors.sectors.name',
      id: 'service_sectors.sectors.name',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Sector" />,
      // Función de ordenamiento client-side para relaciones anidadas
      sortingFn: (rowA, rowB) => {
        const sectorA = rowA.original.service_sectors?.sectors?.name || '';
        const sectorB = rowB.original.service_sectors?.sectors?.name || '';
        return sectorA.localeCompare(sectorB);
      },
      cell: ({ row }) => {
        return row.original.service_sectors?.sectors?.name ? (
          <Badge variant={'outline'} className="font-medium">
            {row.original.service_sectors.sectors.name}
          </Badge>
        ) : null;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.service_sectors?.sectors?.name || '';
      },
    },
    {
      accessorKey: 'service_areas.areas_cliente.descripcion_corta',
      id: 'service_areas.areas_cliente.descripcion_corta',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Área" />,
      // Función de ordenamiento client-side para relaciones anidadas
      sortingFn: (rowA, rowB) => {
        const areaA = rowA.original.service_areas?.areas_cliente?.descripcion_corta || '';
        const areaB = rowB.original.service_areas?.areas_cliente?.descripcion_corta || '';
        return areaA.localeCompare(areaB);
      },
      cell: ({ row }) => {
        return row.original.service_areas?.areas_cliente?.descripcion_corta ? (
          <Badge variant={'outline'} className="font-medium">
            {row.original.service_areas.areas_cliente.descripcion_corta}
          </Badge>
        ) : null;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.service_areas?.areas_cliente?.descripcion_corta || '';
      },
    },
    {
      accessorKey: 'type_service',
      id: 'type_service',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Tipo de servicio" />,
      cell: ({ row }) => {
        return row.original.type_service ? (
          <Badge className="font-medium capitalize">{row.original.type_service.replaceAll('_', ' ')}</Badge>
        ) : null;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.type_service ? row.type_service.replaceAll('_', ' ') : '';
      },
    },
    {
      accessorKey: 'dailyreport_customer_equipment_relations.equipos_clientes.name',
      id: 'dailyreport_customer_equipment_relations.equipos_clientes.name',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Equipo cliente" />,
      // Función de ordenamiento client-side para relaciones anidadas
      sortingFn: (rowA, rowB) => {
        const eqA = rowA.original.dailyreport_customer_equipment_relations?.[0]?.equipos_clientes?.name || '';
        const eqB = rowB.original.dailyreport_customer_equipment_relations?.[0]?.equipos_clientes?.name || '';
        return eqA.localeCompare(eqB);
      },
      cell: ({ row }) => {
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.dailyreport_customer_equipment_relations?.map((rel) => (
              <Badge variant="default" className="select-none text-nowrap" key={rel.id}>
                {rel.equipos_clientes?.name} ({rel.equipos_clientes?.type})
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || ([] as any);
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        return value.some((val: any) => rowValues.some((rel: any) => rel.equipos_clientes?.name === val));
      },
      exportFormatter: (value, row) => {
        return (
          row.dailyreport_customer_equipment_relations
            ?.map((rel) => `${rel.equipos_clientes?.name} (${rel.equipos_clientes?.type})`)
            .join(', ') || ''
        );
      },
    },
    // Columnas para Chofer/Ayudante en jornadas 12/24 hrs
    {
      accessorKey: 'chofer_dia',
      id: 'chofer_dia',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Chofer Día" />,
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations?.find((r) => r.role === 'chofer_dia')?.employees;
        const empB = rowB.original.dailyreportemployeerelations?.find((r) => r.role === 'chofer_dia')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is12or24 = workingDay === 'jornada 12 horas' || workingDay === 'jornada 24 horas';
        if (!is12or24) return <span className="text-muted-foreground">-</span>;

        if (isLoadingEmployees && !row.original.dailyreportemployeerelations) {
          return <Skeleton className="h-5 w-24" />;
        }

        const employeeRel = row.original.dailyreportemployeerelations?.find((r) => r.role === 'chofer_dia');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground">Sin asignar</span>;
        }

        const employee = employeeRel.employees;
        const employeeName = `${employee.lastname} ${employee.firstname}`;
        return renderEmployeeBadge(employeeName, employee.id, row.original.id);
      },
      exportFormatter: (value, row) => {
        const emp = row.dailyreportemployeerelations?.find((r) => r.role === 'chofer_dia')?.employees;
        return emp ? `${emp.lastname} ${emp.firstname}` : '';
      },
    },
    {
      accessorKey: 'ayudante_dia',
      id: 'ayudante_dia',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Ayudante Día" />,
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_dia')?.employees;
        const empB = rowB.original.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_dia')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is12or24 = workingDay === 'jornada 12 horas' || workingDay === 'jornada 24 horas';
        if (!is12or24) return <span className="text-muted-foreground">-</span>;

        if (isLoadingEmployees && !row.original.dailyreportemployeerelations) {
          return <Skeleton className="h-5 w-24" />;
        }

        const employeeRel = row.original.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_dia');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground italic">Opcional</span>;
        }

        const employee = employeeRel.employees;
        const employeeName = `${employee.lastname} ${employee.firstname}`;
        return renderEmployeeBadge(employeeName, employee.id, row.original.id);
      },
      exportFormatter: (value, row) => {
        const emp = row.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_dia')?.employees;
        return emp ? `${emp.lastname} ${emp.firstname}` : '';
      },
    },
    {
      accessorKey: 'chofer_noche',
      id: 'chofer_noche',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Chofer Noche" />,
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations?.find((r) => r.role === 'chofer_noche')?.employees;
        const empB = rowB.original.dailyreportemployeerelations?.find((r) => r.role === 'chofer_noche')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is24 = workingDay === 'jornada 24 horas';
        if (!is24) return <span className="text-muted-foreground">-</span>;

        if (isLoadingEmployees && !row.original.dailyreportemployeerelations) {
          return <Skeleton className="h-5 w-24" />;
        }

        const employeeRel = row.original.dailyreportemployeerelations?.find((r) => r.role === 'chofer_noche');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground">Sin asignar</span>;
        }

        const employee = employeeRel.employees;
        const employeeName = `${employee.lastname} ${employee.firstname}`;
        return renderEmployeeBadge(employeeName, employee.id, row.original.id);
      },
      exportFormatter: (value, row) => {
        const emp = row.dailyreportemployeerelations?.find((r) => r.role === 'chofer_noche')?.employees;
        return emp ? `${emp.lastname} ${emp.firstname}` : '';
      },
    },
    {
      accessorKey: 'ayudante_noche',
      id: 'ayudante_noche',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Ayudante Noche" />,
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_noche')?.employees;
        const empB = rowB.original.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_noche')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is24 = workingDay === 'jornada 24 horas';
        if (!is24) return <span className="text-muted-foreground">-</span>;

        if (isLoadingEmployees && !row.original.dailyreportemployeerelations) {
          return <Skeleton className="h-5 w-24" />;
        }

        const employeeRel = row.original.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_noche');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground italic">Opcional</span>;
        }

        const employee = employeeRel.employees;
        const employeeName = `${employee.lastname} ${employee.firstname}`;
        return renderEmployeeBadge(employeeName, employee.id, row.original.id);
      },
      exportFormatter: (value, row) => {
        const emp = row.dailyreportemployeerelations?.find((r) => r.role === 'ayudante_noche')?.employees;
        return emp ? `${emp.lastname} ${emp.firstname}` : '';
      },
    },
    {
      accessorKey: 'dailyreportemployeerelations.employees.lastname',
      id: 'dailyreportemployeerelations.employees.lastname',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Empleados" />,
      // Función de ordenamiento client-side para empleados
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations?.[0]?.employees;
        const empB = rowB.original.dailyreportemployeerelations?.[0]?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      cell: ({ row }) => {
        // Mostrar skeleton mientras cargan los empleados
        if (isLoadingEmployees && !row.original.dailyreportemployeerelations) {
          return (
            <div className="flex gap-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          );
        }

        const employeeRelations = row.original.dailyreportemployeerelations || [];

        return (
          <div className="flex flex-wrap gap-1">
            {employeeRelations.map((rel) => {
              if (!rel.employees) return null;
              const employeeName = `${rel.employees.lastname} ${rel.employees.firstname}`;
              if (!employeeName.trim()) return null;

              return renderEmployeeBadge(employeeName, rel.employees.id, row.original.id, rel.id);
            })}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        const relations = row.original.dailyreportemployeerelations || [];
        if (!Array.isArray(relations) || !Array.isArray(value)) return false;
        return value.some((val) => relations.some((rel) => rel.employees?.full_name === val));
      },
      exportFormatter: (value, row) => {
        return (
          row.dailyreportemployeerelations
            ?.map((rel) => rel.employees?.full_name || '')
            .filter(Boolean)
            .join(', ') || ''
        );
      },
    },
    {
      accessorKey: 'dailyreportequipmentrelations.vehicles.domain',
      id: 'dailyreportequipmentrelations.vehicles.domain',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Equipo" />,
      // Función de ordenamiento client-side para equipos
      sortingFn: (rowA, rowB) => {
        const eqA = rowA.original.dailyreportequipmentrelations?.[0]?.vehicles;
        const eqB = rowB.original.dailyreportequipmentrelations?.[0]?.vehicles;
        const nameA = eqA ? eqA.domain || eqA.intern_number || '' : '';
        const nameB = eqB ? eqB.domain || eqB.intern_number || '' : '';
        return nameA.localeCompare(nameB);
      },
      cell: ({ row }) => {
        // Mostrar skeleton mientras cargan los equipos
        if (isLoadingEquipment && !row.original.dailyreportequipmentrelations) {
          return (
            <div className="flex gap-1">
              <Skeleton className="h-5 w-20" />
            </div>
          );
        }

        const equipmentRelations = row.original.dailyreportequipmentrelations || [];

        return (
          <div className="flex flex-wrap gap-1">
            {equipmentRelations.map((rel) => {
              // Renderizar vehículo
              if (rel.vehicles && rel.equipment_id) {
                const equipmentName = rel.vehicles.domain || rel.vehicles.intern_number || '';
                if (!equipmentName.trim()) return null;

                const deviation = rel.vehicles.id ? getEquipmentDeviation(rel.vehicles.id, row.original.id) : null;
                const isDuplicated = deviation?.is_duplicated ?? false;
                const isUnassigned = deviation?.is_unassigned_to_client ?? false;
                const condition = deviation?.condition || rel.vehicles?.condition || 'operativo';
                const hasConditionIssue = ['no operativo', 'en reparacion'].includes(condition);
                const isNonStandardCondition = condition !== 'operativo';

                const conditionLabels: Record<string, string> = {
                  'no operativo': 'No operativo',
                  'en reparacion': 'En reparación',
                  'operativo condicionado': 'Condicionado',
                  'en preparacion': 'En preparación',
                };

                let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
                let badgeClassName = 'select-none text-nowrap';

                if (loadingValidations) {
                  badgeVariant = 'secondary';
                  badgeClassName = cn(badgeClassName, 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400');
                } else if (isDuplicated) {
                  badgeVariant = 'outline';
                  badgeClassName = cn(
                    badgeClassName,
                    'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400'
                  );
                } else if (condition === 'no operativo') {
                  badgeVariant = 'outline';
                  badgeClassName = cn(
                    badgeClassName,
                    'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-400'
                  );
                } else if (condition === 'en reparacion') {
                  badgeVariant = 'outline';
                  badgeClassName = cn(
                    badgeClassName,
                    'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-400'
                  );
                } else if (isUnassigned) {
                  badgeVariant = 'outline';
                  badgeClassName = cn(
                    badgeClassName,
                    'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                  );
                } else if (condition === 'operativo condicionado') {
                  badgeVariant = 'outline';
                  badgeClassName = cn(
                    badgeClassName,
                    'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-400'
                  );
                } else if (condition === 'en preparacion') {
                  badgeVariant = 'outline';
                  badgeClassName = cn(
                    badgeClassName,
                    'border-gray-400 bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-500'
                  );
                } else {
                  badgeClassName = cn(badgeClassName, 'dark:text-black');
                }

                const tooltipMessages: string[] = [];
                if (loadingValidations) {
                  tooltipMessages.push('Validando asignaciones...');
                } else {
                  if (hasConditionIssue) tooltipMessages.push(`Condición: ${conditionLabels[condition]}`);
                  else if (isNonStandardCondition) tooltipMessages.push(`Condición: ${conditionLabels[condition]}`);
                  if (isDuplicated) tooltipMessages.push('Asignado en múltiples filas del parte diario');
                  if (isUnassigned) tooltipMessages.push('No asignado al cliente de esta fila');
                  if (tooltipMessages.length === 0) tooltipMessages.push('Equipo asignado correctamente');
                }

                return (
                  <TooltipProvider key={rel.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant={badgeVariant} className={badgeClassName}>
                          {equipmentName}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {tooltipMessages.map((msg, i) => (
                          <p key={i}>{msg}</p>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              // Renderizar otro equipo operativo
              if (rel.other_equipment && rel.other_equipment_id) {
                const otherEquipmentName = rel.other_equipment.intern_number || rel.other_equipment.serial_number || '';
                if (!otherEquipmentName.trim()) return null;

                return (
                  <TooltipProvider key={rel.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="select-none text-nowrap border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400"
                        >
                          {otherEquipmentName}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Otro Equipo Operativo</p>
                        <p>{rel.other_equipment.type?.name || 'Sin tipo'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return null;
            })}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        const relations = row.original.dailyreportequipmentrelations || [];
        if (!Array.isArray(relations) || !Array.isArray(value)) return false;
        return value.some((val) =>
          relations.some((rel) => (rel.vehicles?.domain || rel.vehicles?.intern_number) === val)
        );
      },
      exportFormatter: (value, row) => {
        const vehicles =
          row.dailyreportequipmentrelations
            ?.filter((rel) => rel.equipment_id !== null)
            .map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number || '')
            .filter(Boolean) || [];
        const otherEquipment =
          row.dailyreportequipmentrelations
            ?.filter((rel) => rel.other_equipment_id !== null)
            .map((rel) => rel.other_equipment?.intern_number || rel.other_equipment?.serial_number || '')
            .filter(Boolean) || [];
        return [...vehicles, ...otherEquipment].join(', ') || '';
      },
    },
    {
      accessorKey: 'working_day',
      id: 'working_day',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Jornada" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.working_day}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.working_day || '';
      },
    },
    {
      accessorKey: 'start_time',
      id: 'start_time',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Hora de inicio" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.start_time}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.start_time || '';
      },
    },
    {
      accessorKey: 'end_time',
      id: 'end_time',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Hora de fin" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.end_time}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.end_time || '';
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Estado" />,
      cell: ({ row }) => {
        const variants = {
          ejecutado: 'success',
          pendiente: 'default',
          reprogramado: 'warning',
          cancelado: 'destructive',
          sin_recursos_asignados: 'warning',
        };

        const status = row.original.status;
        const cancelReason = row.original.cancel_reason;
        const isCancelled = status === 'cancelado';

        if (isCancelled && cancelReason) {
          return (
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Badge
                      variant={variants[status as keyof typeof variants] as any}
                      className="font-medium capitalize whitespace-nowrap"
                    >
                      {status.replaceAll('_', ' ')}
                      <Info className="ml-1 h-3.5 w-3.5 flex-shrink-0 inline-block" />
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[400px]">
                  <p className="whitespace-pre-wrap break-words">{cancelReason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        const is24Hours = row.original.working_day === 'jornada 24 horas';

        if (is24Hours && status !== 'ejecutado') {
          const completedDay = row.original.completed_day;
          const completedNight = row.original.completed_night;

          return (
            <Badge
              variant={
                completedDay || completedNight ? ('info' as any) : (variants[status as keyof typeof variants] as any)
              }
              className={'font-medium capitalize'}
            >
              {completedDay || completedNight ? 'Ejecutado parcial' : status.replaceAll('_', ' ')}
            </Badge>
          );
        }

        return (
          <Badge variant={variants[status as keyof typeof variants] as any} className="font-medium capitalize">
            {status.replaceAll('_', ' ')}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      exportFormatter: (value, row) => {
        return row.status ? row.status.replaceAll('_', ' ') : '';
      },
    },
    {
      id: 'actions',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Acciones" />,
      cell: ({ row }) => {
        // Comprobamos si la fecha es hoy
        const isToday = moment(reportDate).isSame(moment(), 'day');

        return (
          <div className={cn('flex gap-1', moment(reportDate).isBefore(moment()) ? 'gap-0 justify-center' : '')}>
            {(row.original.status !== 'ejecutado' || (isToday && row.original.status === 'ejecutado')) &&
              row.original.status !== 'en_certificacion' && (
                <PermissionGuard module="operaciones" tab="detalle-parte-diario" action="update">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:text-blue-500"
                          data-testid={`edit-button-${row.original.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRow(row.original);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Editar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </PermissionGuard>
              )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HistoryModal onlyIcon dailyReportRowId={row.original.id} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Ver historial</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ServiceDetailModal serviceData={row.original as any} reportDate={reportDate} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Ver detalle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DeleteConfirmationModal
                    refetchData={refetchDailyReport}
                    date={reportDate}
                    dailyReportId={row.original.id}
                    preparteInfo={row.original.preparte}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Eliminar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
      excludeFromExport: true,
    },
  ];

  return (
    <>
      <div
        className={cn(
          'flex justify-between items-center mb-4',
          dailyReport[0]?.status !== 'abierto' ? 'justify-end' : ''
        )}
      >
        <PermissionGuard module="operaciones" tab="detalle-parte-diario" action="create">
          <DailyReportForm
            customers={customers}
            employees={employees}
            equipments={equipments}
            otherEquipments={otherEquipments}
            isLoadingFormData={isLoadingFormData}
            dailyReport={dailyReport}
            formattedData={formattedData}
            refetchDailyReport={refetchDailyReport}
            disabled={dailyReport[0]?.status !== 'abierto' && dailyReport[0]?.date !== moment().format('YYYY-MM-DD')}
          />
        </PermissionGuard>
        <PermissionGuard module="operaciones" tab="detalle-parte-diario" action="create">
          <ClonarRegistrosButton
            formattedData={formattedData}
            selectedRows={formattedData.filter((row) => selectedRows.some((sr) => sr.id === row.id))}
            fetchAllFormattedData={fetchAllFormattedData}
            onSuccess={refetchDailyReport}
          />
        </PermissionGuard>
      </div>

      {/* Mostrar loading mientras cargan los datos base */}
      {isLoadingRows ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando registros...</span>
        </div>
      ) : (
        <BaseDataTable
          columns={columns}
          savedVisibility={savedVisibility}
          data={tableData}
          row_classname={(row) => {
            if (!row.created_at || !dailyReport[0]?.date) return '';
            // Parsear la fecha del parte (formato DD-MM-YYYY) con moment
            const reportDateMoment = moment(dailyReport[0]?.date, 'YYYY-MM-DD').endOf('day');
            // Parsear created_at con moment
            const createdAt = moment(row.created_at);
            // Si created_at es posterior a la fecha del parte, fue creado post-cierre

            if (row.last_comercial_edit_at) return 'bg-blue-100 dark:bg-blue-900/30';
            return createdAt.isAfter(reportDateMoment) ? 'bg-yellow-100 dark:bg-yellow-900/30' : '';
          }}
          tableId="dailyReportServerTable"
          enableRowSelection={
            canEdit
              ? (row) => row.original.status !== 'sin_recursos_asignados' && row.original.status !== 'reprogramado'
              : false
          }
          onRowSelectionChange={(rows) => {
            setSelectedRows(rows);
          }}
          serverSide={false}
          fetchAllData={handleFetchAllData as any}
          queryKey={`daily-report-server-${dailyReportId}`}
          toolbarOptions={{
            initialVisibleFilters: savedFilters,
            showExport: true,
            searchableColumns: [],
            filterableColumns: [
              {
                columnId: 'customers.name',
                title: 'Cliente',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'customers.name' as '*',
                  relation: '{"customers": "customer_id"}',
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (
                    data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'customers.name'>>>
                  ) => {
                    return data.map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                  },
                },
              },
              {
                columnId: 'customer_services.service_name',
                title: 'Servicio',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'customer_services.service_name' as '*',
                  relation: '{"customer_services": "service_id"}',
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (
                    data: Awaited<
                      ReturnType<typeof querySelectDistinct<'dailyreportrows', 'customer_services.service_name'>>
                    >
                  ) => {
                    return data.map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                  },
                },
              },
              {
                columnId: 'service_items.item_name',
                title: 'Item',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'service_items.item_name' as '*',
                  relation: '{"service_items": "item_id"}',
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (
                    data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'service_items.item_name'>>>
                  ) => {
                    return data.map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                  },
                },
              },
              {
                columnId: 'service_sectors.sectors.name',
                title: 'Sector',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'id' as '*',
                  multiJoinPaths: {
                    joins: [
                      {
                        from_table: 'dailyreportrows',
                        to_table: 'service_sectors',
                        from_column: 'sector_service_id',
                        to_column: 'id',
                      },
                      {
                        from_table: 'service_sectors',
                        to_table: 'sectors',
                        from_column: 'sector_id',
                        to_column: 'id',
                      },
                    ],
                    final_column: 'sectors.name',
                  },
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'id'>>>) => {
                    return data
                      .filter((value) => value.col_value !== null)
                      .map((value) => ({
                        label: String(value.display_value),
                        value: String(value.col_value),
                        count: value.col_count,
                      }));
                  },
                },
              },
              {
                columnId: 'service_areas.areas_cliente.descripcion_corta',
                title: 'Área',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'id' as '*',
                  multiJoinPaths: {
                    joins: [
                      {
                        from_table: 'dailyreportrows',
                        to_table: 'service_areas',
                        from_column: 'areas_service_id',
                        to_column: 'id',
                      },
                      {
                        from_table: 'service_areas',
                        to_table: 'areas_cliente',
                        from_column: 'area_id',
                        to_column: 'id',
                      },
                    ],
                    final_column: 'areas_cliente.descripcion_corta',
                  },
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'id'>>>) => {
                    return data
                      .filter((value) => value.col_value !== null)
                      .map((value) => ({
                        label: String(value.display_value),
                        value: String(value.col_value),
                        count: value.col_count,
                      }));
                  },
                },
              },
              {
                columnId: 'type_service',
                title: 'Tipo de servicio',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'type_service' as '*',
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (
                    data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'type_service'>>>
                  ) => {
                    return data.map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                  },
                },
              },
              {
                columnId: 'working_day',
                title: 'Jornada',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'working_day' as '*',
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'working_day'>>>) => {
                    return data.map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                  },
                },
              },
              {
                columnId: 'status',
                title: 'Estado',
                config: {
                  tableName: 'dailyreportrows',
                  select: 'status' as '*',
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'status'>>>) => {
                    return data.map((value) => ({
                      label: String(value.display_value),
                      value: String(value.col_value),
                      count: value.col_count,
                    }));
                  },
                },
              },
              {
                columnId: 'dailyreportemployeerelations.employees.lastname',
                title: 'Empleados',
                config: {
                  tableName: 'dailyreportrows' as const,
                  select: 'id' as '*',
                  multiJoinPaths: {
                    joins: [
                      {
                        from_table: 'dailyreportrows',
                        to_table: 'dailyreportemployeerelations',
                        from_column: 'id',
                        to_column: 'daily_report_row_id',
                      },
                      {
                        from_table: 'dailyreportemployeerelations',
                        to_table: 'employees',
                        from_column: 'employee_id',
                        to_column: 'id',
                      },
                    ],
                    final_column: 'employees.full_name',
                  },
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'id'>>>) => {
                    return data
                      .filter((value) => value.col_value !== null)
                      .map((value) => ({
                        label: String(value.display_value),
                        value: String(value.col_value),
                        count: value.col_count,
                      }));
                  },
                },
              },
              {
                columnId: 'dailyreportequipmentrelations.vehicles.domain',
                title: 'Equipo',
                config: {
                  tableName: 'dailyreportrows' as const,
                  select: 'id' as '*',
                  multiJoinPaths: {
                    joins: [
                      {
                        from_table: 'dailyreportrows',
                        to_table: 'dailyreportequipmentrelations',
                        from_column: 'id',
                        to_column: 'daily_report_row_id',
                      },
                      {
                        from_table: 'dailyreportequipmentrelations',
                        to_table: 'vehicles',
                        from_column: 'equipment_id',
                        to_column: 'id',
                      },
                    ],
                    final_column: 'vehicles.domain',
                  },
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'id'>>>) => {
                    return data
                      .filter((value) => value.col_value !== null)
                      .map((value) => ({
                        label: String(value.display_value),
                        value: String(value.col_value),
                        count: value.col_count,
                      }));
                  },
                },
              },
              {
                columnId: 'dailyreport_customer_equipment_relations.equipos_clientes.name',
                title: 'Equipo cliente',
                config: {
                  tableName: 'dailyreportrows' as const,
                  select: 'id' as '*',
                  multiJoinPaths: {
                    joins: [
                      {
                        from_table: 'dailyreportrows',
                        to_table: 'dailyreport_customer_equipment_relations',
                        from_column: 'id',
                        to_column: 'daily_report_row_id',
                      },
                      {
                        from_table: 'dailyreport_customer_equipment_relations',
                        to_table: 'equipos_clientes',
                        from_column: 'customer_equipment_id',
                        to_column: 'id',
                      },
                    ],
                    final_column: 'equipos_clientes.name',
                  },
                  p_filters: { daily_report_id: dailyReportId },
                  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'id'>>>) => {
                    return data
                      .filter((value) => value.col_value !== null)
                      .map((value) => ({
                        label: String(value.display_value),
                        value: String(value.col_value),
                        count: value.col_count,
                      }));
                  },
                },
              },
            ],
            showFilterOptions: true,
            bulkAction: canEdit
              ? {
                  enabled: true,
                  label: 'Editar',
                  icon: <Edit className="h-4 w-4" />,
                  disabled: selectedRows.some((row) => row.status === 'ejecutado'),
                  disabledReason: 'No se pueden editar registros ejecutados. Deseleccioná las filas ejecutadas',
                  onClick: (rows) => {
                    setSelectedRows(rows);
                    setIsBulkEditModalOpen(true);
                  },
                }
              : undefined,
          }}
        />
      )}

      {/* Modal de edición masiva */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedRows={selectedRows as any}
        dailyReportId={dailyReportId}
        onSuccess={(updatedRowIds?: string[]) => {
          // Los datos se actualizan automáticamente via invalidateQueries en el mutation hook
          // Solo necesitamos limpiar la selección local
          if (updatedRowIds && updatedRowIds.length > 0) {
            setSelectedRows((prev) => prev.filter((row) => !updatedRowIds.includes(row.id)));
          } else {
            setSelectedRows([]);
          }
        }}
      />
    </>
  );
}
