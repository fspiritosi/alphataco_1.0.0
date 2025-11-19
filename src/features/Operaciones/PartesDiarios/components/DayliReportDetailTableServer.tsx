'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { useDailyReportFormStore } from '@/stores/dailyReportFormStore';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Edit, Info } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import {
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
  getCustomers,
  getDailyReportById,
} from '../actions/actions';
import { fetchAllDailyReportData, fetchDailyReportData } from '../actions/server-actions';
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

// Tipo inferido automáticamente del retorno de la función del servidor
type DailyReportServerData = Awaited<ReturnType<typeof fetchDailyReportData>>['rows'][0];

export default function DayliReportDetailTableServer({
  dailyReportId,
  reportDate,
  initialData,
  savedFilters,
  savedVisibility,
  dailyReport,
}: {
  dailyReportId: string;
  reportDate: string;
  initialData?: Awaited<ReturnType<typeof fetchDailyReportData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
}) {
  // Estado para controlar la apertura del modal de edición masiva
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DailyReportServerData[]>([]);

  // selectedRow ahora se maneja en el store de Zustand

  // Estado para datos transformados (para DailyReportForm y ClonarRegistrosButton)
  const [formattedData, setFormattedData] = useState<any[]>([]);

  // Estado para empleados, equipos y clientes (carga asíncrona)
  const [employees, setEmployees] = useState<
    Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>> | undefined
  >();
  const [equipments, setEquipments] = useState<
    Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>> | undefined
  >();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>> | undefined>();
  const [loadingValidations, setLoadingValidations] = useState(true);
  const queryClient = useQueryClient();

  // Función para refrescar los datos
  const refetchDailyReport = async () => {
    // Invalidar la query específica para que se refresque automáticamente
    const queryKey = `daily-report-server-${dailyReportId}`;
    await queryClient.invalidateQueries({
      queryKey: [queryKey],
      exact: false, // Esto invalidará todas las queries que empiecen con este queryKey
    });
  };

  // Función para manejar la edición de una fila
  const handleEditRow = useCallback(
    (row: DailyReportServerData) => {
      // Formatear la fila directamente usando la función utilitaria
      const transformedRow = formatDailyReportRow(row, reportDate);

      // Buscar el cliente completo para los filtros
      const customer = customers?.find((c) => c.id === transformedRow.data_to_clone?.customer_id);

      // Abrir modal con el store (esto procesa todo de una vez)
      useDailyReportFormStore.getState().openModalWithRow(transformedRow, customer || null);

      // Abrir el modal físicamente
      document.getElementById('open-button-daily-report')?.click();
    },
    [reportDate, customers]
  );

  // Cargar empleados, equipos y clientes de forma asíncrona en el cliente
  useEffect(() => {
    const loadValidationData = async () => {
      try {
        const [employeesData, equipmentsData, customersData] = await Promise.all([
          getActiveEmployeesForDailyReport(),
          getActiveEquipmentsForDailyReport(),
          getCustomers(),
        ]);
        setEmployees(employeesData);
        setEquipments(equipmentsData);
        setCustomers(customersData);
      } catch (error) {
        console.error('Error loading validation data:', error);
      } finally {
        setLoadingValidations(false);
      }
    };

    loadValidationData();
  }, []);

  // Transformar datos del servidor al formato esperado por DailyReportForm y ClonarRegistrosButton
  useEffect(() => {
    if (initialData?.rows) {
      const transformed = formatDailyReportData(initialData.rows, reportDate);
      setFormattedData(transformed);
    }
  }, [initialData, reportDate]);

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
        cancel_reason: row.cancel_reason,
        employees:
          row.dailyreportemployeerelations?.map((rel) => `${rel.employees?.lastname} ${rel.employees?.firstname}`) ||
          [],
        equipment:
          row.dailyreportequipmentrelations?.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number) || [],
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
          })) || [],
        equipment_references:
          row.dailyreportequipmentrelations?.map((rel) => ({
            ...rel.vehicles,
            name: rel.vehicles?.domain || rel.vehicles?.intern_number,
            id: rel.vehicles?.id,
            brand_vehicles: rel.vehicles?.brand_vehicles?.name,
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

  // Función auxiliar para detectar empleados duplicados
  const getDuplicatedEmployees = (data: DailyReportServerData[]): Set<string> => {
    const employeeCounts = new Map<string, number>();

    data.forEach((row) => {
      row.dailyreportemployeerelations?.forEach((rel) => {
        const employeeName = `${rel.employees?.lastname} ${rel.employees?.firstname}`;
        if (employeeName.trim()) {
          employeeCounts.set(employeeName, (employeeCounts.get(employeeName) || 0) + 1);
        }
      });
    });

    return new Set(
      Array.from(employeeCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([employee, _]) => employee)
    );
  };

  // Función auxiliar para detectar equipos duplicados
  const getDuplicatedEquipments = (data: DailyReportServerData[]): Set<string> => {
    const equipmentCounts = new Map<string, number>();

    data.forEach((row) => {
      row.dailyreportequipmentrelations?.forEach((rel) => {
        const equipmentName = rel.vehicles?.domain || rel.vehicles?.intern_number || '';
        if (equipmentName.trim()) {
          equipmentCounts.set(equipmentName, (equipmentCounts.get(equipmentName) || 0) + 1);
        }
      });
    });

    return new Set(
      Array.from(equipmentCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([equipment, _]) => equipment)
    );
  };

  // Función auxiliar para detectar empleados no asignados al cliente
  const getUnassignedEmployees = (
    data: DailyReportServerData[],
    employees?: Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>
  ): Map<string, string> => {
    const unassignedMap = new Map<string, string>();

    if (!employees) return unassignedMap;

    data.forEach((row) => {
      const customerId = row.customer_id;
      if (!customerId) return;

      row.dailyreportemployeerelations?.forEach((rel) => {
        if (!rel.employees?.id) return;

        const employee = employees.find((emp) => emp.id === rel.employees!.id);
        if (!employee) return;

        const isAssigned = employee.contractor_employee?.some((ce) => ce.customers?.id === customerId);

        if (!isAssigned) {
          const employeeName = `${employee.lastname} ${employee.firstname}`;
          unassignedMap.set(employeeName, customerId);
        }
      });
    });

    return unassignedMap;
  };

  // Función auxiliar para detectar equipos no asignados al cliente
  const getUnassignedEquipments = (
    data: DailyReportServerData[],
    equipments?: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>
  ): Map<string, string> => {
    const unassignedMap = new Map<string, string>();

    if (!equipments) return unassignedMap;

    data.forEach((row) => {
      const customerId = row.customer_id;
      if (!customerId) return;

      row.dailyreportequipmentrelations?.forEach((rel) => {
        if (!rel.vehicles?.id) return;

        const equipment = equipments.find((eq) => eq.id === rel.vehicles!.id);
        if (!equipment) return;

        const isAssigned = equipment.contractor_equipment?.some((ce) => ce.customers?.id === customerId);

        if (!isAssigned) {
          const equipmentName = equipment.domain || equipment.intern_number || '';
          unassignedMap.set(equipmentName, customerId);
        }
      });
    });

    return unassignedMap;
  };

  // Definición de columnas
  const columns: ExtendedColumnDef<DailyReportServerData>[] = [
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
    },
    {
      accessorKey: 'customers.name',
      id: 'customers.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
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
      header: ({ column }) => <DataTableColumnHeader className="w-[130px]" column={column} title="Servicio" />,
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
      header: ({ column }) => <DataTableColumnHeader className="w-[130px]" column={column} title="Item" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Área" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de servicio" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo cliente" />,
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
    {
      accessorKey: 'dailyreportemployeerelations.employees.lastname',
      id: 'dailyreportemployeerelations.employees.lastname',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleados" />,
      cell: ({ row, table }) => {
        const employeeRelations = row.original.dailyreportemployeerelations || [];
        const allData = table.getRowModel().rows.map((r) => r.original);
        const duplicatedEmployees = getDuplicatedEmployees(allData);
        const unassignedEmployees = employees ? getUnassignedEmployees(allData, employees) : new Map();

        return (
          <div className="flex flex-wrap gap-1">
            {employeeRelations.map((rel) => {
              if (!rel.employees) return null;
              const employeeName = `${rel.employees.lastname} ${rel.employees.firstname}`;
              if (!employeeName.trim()) return null;

              const isDuplicated = duplicatedEmployees.has(employeeName);
              const isUnassigned = unassignedEmployees.has(employeeName);

              let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
              let badgeClassName = 'select-none text-nowrap';

              if (isDuplicated) {
                badgeVariant = 'outline';
                badgeClassName = cn(
                  badgeClassName,
                  'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400'
                );
              } else if (isUnassigned) {
                badgeVariant = 'outline';
                badgeClassName = cn(
                  badgeClassName,
                  'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                );
              } else {
                badgeClassName = cn(badgeClassName, 'dark:text-black');
              }

              let tooltipMessage = '';
              if (loadingValidations) {
                tooltipMessage = 'Cargando validaciones...';
              } else if (isDuplicated) {
                tooltipMessage = 'Este empleado está asignado en múltiples filas del parte diario';
              } else if (isUnassigned) {
                tooltipMessage = 'Este empleado no está asignado al cliente de esta fila';
              } else {
                tooltipMessage = 'Empleado asignado correctamente';
              }

              return (
                <TooltipProvider key={rel.id} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge variant={badgeVariant} className={badgeClassName}>
                          {employeeName}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || [];
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        return value.some((val) =>
          rowValues.some((rel: any) => `${rel.employees?.lastname} ${rel.employees?.firstname}` === val)
        );
      },
      exportFormatter: (value, row) => {
        return (
          row.dailyreportemployeerelations
            ?.map((rel) => `${rel.employees?.lastname} ${rel.employees?.firstname}`)
            .join(', ') || ''
        );
      },
    },
    {
      accessorKey: 'dailyreportequipmentrelations.vehicles.domain',
      id: 'dailyreportequipmentrelations.vehicles.domain',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row, table }) => {
        const equipmentRelations = row.original.dailyreportequipmentrelations || [];
        const allData = table.getRowModel().rows.map((r) => r.original);
        const duplicatedEquipments = getDuplicatedEquipments(allData);
        const unassignedEquipments = equipments ? getUnassignedEquipments(allData, equipments) : new Map();

        return (
          <div className="flex flex-wrap gap-1">
            {equipmentRelations.map((rel) => {
              if (!rel.vehicles) return null;
              const equipmentName = rel.vehicles.domain || rel.vehicles.intern_number || '';
              if (!equipmentName.trim()) return null;

              const isDuplicated = duplicatedEquipments.has(equipmentName);
              const isUnassigned = unassignedEquipments.has(equipmentName);

              let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
              let badgeClassName = 'select-none text-nowrap';

              if (isDuplicated) {
                badgeVariant = 'outline';
                badgeClassName = cn(
                  badgeClassName,
                  'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400'
                );
              } else if (isUnassigned) {
                badgeVariant = 'outline';
                badgeClassName = cn(
                  badgeClassName,
                  'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                );
              } else {
                badgeClassName = cn(badgeClassName, 'dark:text-black');
              }

              let tooltipMessage = '';
              if (loadingValidations) {
                tooltipMessage = 'Cargando validaciones...';
              } else if (isDuplicated) {
                tooltipMessage = 'Este equipo está asignado en múltiples filas del parte diario';
              } else if (isUnassigned) {
                tooltipMessage = 'Este equipo no está asignado al cliente de esta fila';
              } else {
                tooltipMessage = 'Equipo asignado correctamente';
              }

              return (
                <TooltipProvider key={rel.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={badgeVariant} className={badgeClassName}>
                        {equipmentName}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || [];
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        return value.some((val) =>
          rowValues.some((rel: any) => (rel.vehicles?.domain || rel.vehicles?.intern_number) === val)
        );
      },
      exportFormatter: (value, row) => {
        return (
          row.dailyreportequipmentrelations
            ?.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number || '')
            .join(', ') || ''
        );
      },
    },
    {
      accessorKey: 'working_day',
      id: 'working_day',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora de inicio" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora de fin" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        // Comprobamos si la fecha es hoy
        const isToday = moment(reportDate).isSame(moment(), 'day');

        return (
          <div className={cn('flex gap-1', moment(reportDate).isBefore(moment()) ? 'gap-0 justify-center' : '')}>
            {(row.original.status !== 'ejecutado' || (isToday && row.original.status === 'ejecutado')) &&
              row.original.status !== 'en_certificacion' && (
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
                  <ServiceDetailModal serviceData={row.original} reportDate={reportDate} />
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
        <DailyReportForm
          customers={customers}
          employees={employees}
          equipments={equipments}
          dailyReport={dailyReport}
          formattedData={formattedData}
          refetchDailyReport={refetchDailyReport}
          disabled={dailyReport[0]?.status !== 'abierto' && dailyReport[0]?.date !== moment().format('YYYY-MM-DD')}
        />
        <ClonarRegistrosButton
          formattedData={formattedData}
          selectedRows={selectedRows as any}
          fetchAllFormattedData={fetchAllFormattedData}
        />
      </div>

      <BaseDataTable
        columns={columns}
        savedVisibility={savedVisibility}
        initialData={initialData}
        row_classname={(row) => {
          if (!row.created_at || !dailyReport[0]?.date) return '';
          // Parsear la fecha del parte (formato DD-MM-YYYY) con moment
          const reportDate = moment(dailyReport[0]?.date, 'YYYY-MM-DD').endOf('day');
          // Parsear created_at con moment
          const createdAt = moment(row.created_at);
          // Si created_at es posterior a la fecha del parte, fue creado post-cierre
          return createdAt.isAfter(reportDate) ? 'bg-yellow-100 dark:bg-yellow-900/30' : '';
        }}
        tableId="dailyReportServerTable"
        enableRowSelection={(row) =>
          row.original.status !== 'ejecutado' &&
          row.original.status !== 'sin_recursos_asignados' &&
          row.original.status !== 'reprogramado'
        }
        onRowSelectionChange={(rows) => {
          setSelectedRows(rows);
        }}
        serverSide={true}
        fetchData={async (options) => {
          const result = await fetchDailyReportData({ dailyReportId, ...options });
          return result;
        }}
        fetchAllData={handleFetchAllData}
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
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'dailyreportrows', 'type_service'>>>) => {
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
                  final_column: 'employees.lastname',
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
          bulkAction: {
            enabled: true,
            label: 'Editar',
            icon: <Edit className="h-4 w-4" />,
            onClick: (rows) => {
              setSelectedRows(rows);
              setIsBulkEditModalOpen(true);
            },
          },
        }}
      />

      {/* Modal de edición masiva */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedRows={selectedRows as any}
        onSuccess={(updatedRowIds?: string[]) => {
          // Limpiar la selección después de la edición exitosa
          setTimeout(() => {
            if (updatedRowIds && updatedRowIds.length > 0) {
              setSelectedRows((prev) => prev.filter((row) => !updatedRowIds.includes(row.id)));
            } else {
              setSelectedRows([]);
            }

            // La selección se limpiará automáticamente al actualizar selectedRows
          }, 300);
        }}
      />
    </>
  );
}
