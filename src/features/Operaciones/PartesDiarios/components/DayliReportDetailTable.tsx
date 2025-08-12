'use client';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { cn } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Edit, Info } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
  getCustomers,
  getDailyReportById,
} from '../actions/actions';
import { BulkEditModal } from './BulkEditModal';
import { ClonarRegistrosButton } from './ClonarRegistrosButton';
import { DailyReportForm } from './DailyReportRowForm';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentViewerModal from './DocumentViewerFixed';
import HistoryModal from './HistoryModal';
import { ServiceDetailModal } from './ServiceDetailModal';
export const transformDailyReports = (reports: Awaited<ReturnType<typeof getDailyReportById>>) => {
  const report = reports[0];
  return report?.dailyreportrows?.map((row) => ({
    id: row.id,
    date: report.date,
    type_service: row.type_service,
    customer: row.customers?.name,
    cancel_reason: row.cancel_reason,
    employees: row.dailyreportemployeerelations.map((rel) => rel.employees?.firstname + ' ' + rel.employees?.lastname),
    equipment:
      row.dailyreportequipmentrelations.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number) || [],
    customer_equipment:
      row.dailyreport_customer_equipment_relations.map((rel) => {
        return {
          name: rel.equipos_clientes?.name,
          type: rel.equipos_clientes?.type,
          id: rel.equipos_clientes?.id,
          relacion_id: rel.id,
        };
      }) || [],
    services: row.customer_services?.service_name,
    item: row.service_items?.item_name,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    working_day: row.working_day,
    sector_customer_id: row.service_sectors?.id,
    sector_service_name: row.service_sectors?.sectors?.name,
    areas_customer_id: row.service_areas?.id,
    areas_customer_name: row.service_areas?.areas_cliente?.descripcion_corta,
    description: row.description || '',
    document_path: row.document_path,
    remit_number: row.remit_number,
    employees_references: row.dailyreportemployeerelations.map((rel) => ({
      ...rel.employees,
      name: rel.employees?.firstname + ' ' + rel.employees?.lastname,
      id: rel.employees?.id,
    })),
    equipment_references: row.dailyreportequipmentrelations.map((rel) => ({
      ...rel.vehicles,
      name: rel.vehicles?.domain || rel.vehicles?.intern_number,
      id: rel.vehicles?.id,
    })),
    data_to_clone: {
      customer_id: row.customers?.id,
      service_id: row.customer_services?.id,
      item_id: row.service_items?.id,
      working_day: row.working_day,
      start_time: row.start_time,
      end_time: row.end_time,
      description: row.description,
      type_service: row.type_service,
      // daily_report_id: row.id,
      areas_service_id: row.areas_service_id,
      sector_service_id: row.sector_service_id,
    },
  }));
};

export type DailyReportRow = ReturnType<typeof transformDailyReports>[number];

export function getDailyReportColumns(onEdit: (row: DailyReportRow) => void): ColumnDef<DailyReportRow>[] {
  return [
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
      cell: ({ row }) => {
        return (
          <Checkbox
            disabled={!row.getCanSelect()}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'customer',
      id: 'Cliente',
      // header: () => <span className="w-[200px]">Nombre</span>,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium select-none text-nowrap">{row.original.customer}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'services',
      id: 'Servicio',
      header: ({ column }) => <DataTableColumnHeader className="w-[130px]" column={column} title="Servicio" />,
      cell: ({ row }) => <span className="font-medium">{row.original.services}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'item',
      id: 'Item',
      header: ({ column }) => <DataTableColumnHeader className="w-[130px]" column={column} title="Item" />,
      cell: ({ row }) => <span className="font-medium">{row.original.item}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    {
      accessorKey: 'sector_service_name',
      id: 'Sector',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) => {
        return row.original.sector_service_name ? (
          <Badge variant={'outline'} className="font-medium">
            {row.original.sector_service_name}
          </Badge>
        ) : null;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'areas_customer_name',
      id: 'Área',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Área" />,
      cell: ({ row }) => {
        return row.original.areas_customer_name ? (
          <Badge variant={'outline'} className="font-medium">
            {row.original.areas_customer_name}
          </Badge>
        ) : null;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'type_service',
      id: 'Tipo de servicio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de servicio" />,
      cell: ({ row }) => {
        return row.original.type_service ? (
          <Badge className="font-medium capitalize">{row.original.type_service.replaceAll('_', ' ')}</Badge>
        ) : null;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'customer_equipment',
      id: 'Equipo cliente',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo cliente" />,
      cell: ({ row }) => {
        // const employees = row.original.customer_equipment;
        // if (!employees || employees.length === 0) return null;
        // const [first, ...rest] = employees;
        // if (rest.length === 0) {
        //   return (
        //     <Badge variant="default" className="select-none text-nowrap">
        //       {first.name} ({first.type})
        //     </Badge>
        //   );
        // }
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.customer_equipment.map((employee) => (
              <Badge variant="default" className="select-none text-nowrap" key={employee.id}>
                {employee.name} ({employee.type})
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || ([] as any);
        // Aseguramos que ambos sean arrays
        if (!Array.isArray(rowValues.map((item: any) => item.name)) || !Array.isArray(value)) return false;
        // ¿Algún elemento de value está en rowValues?
        return value.some((val: any) => rowValues.map((item: any) => item.name).includes(val));
      },
    },
    {
      accessorKey: 'employees',
      id: 'Empleados',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleados" />,
      cell: ({ row }) => {
        const employees: string[] = row.original.employees;
        return (
          <div className="flex flex-wrap gap-1">
            {employees.map((employee) => (
              <Badge variant="default" className="select-none text-nowrap" key={employee}>
                {employee}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || [];
        // Aseguramos que ambos sean arrays
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        // ¿Algún elemento de value está en rowValues?
        return value.some((val) => rowValues.includes(val));
      },
    },
    {
      accessorKey: 'equipment',
      id: 'Equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const equipment = row.original.equipment;
        return (
          <div className="flex flex-wrap gap-1">
            {equipment.map((equipment) => (
              <Badge variant="default" className="select-none text-nowrap" key={equipment}>
                {equipment}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue(id) || [];
        // Aseguramos que ambos sean arrays
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        // ¿Algún elemento de value está en rowValues?
        return value.some((val) => rowValues.includes(val));
      },
    },
    {
      accessorKey: 'working_day',
      id: 'Jornada',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.working_day}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'start_time',
      id: 'Hora de inicio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora de inicio" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.start_time}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'end_time',
      id: 'Hora de fin',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora de fin" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.end_time}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      id: 'Estado',
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
                      variant={variants[status as keyof typeof badgeVariants]}
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

        return (
          <Badge variant={variants[status as keyof typeof badgeVariants]} className="font-medium capitalize">
            {status.replaceAll('_', ' ')}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        // Comprobamos si la fecha es hoy
        const isToday = moment(row.original.date).isSame(moment(), 'day');

        // Si el estado es 'ejecutado'
        if (row.original.status === 'ejecutado') {
          const documentComponent = row.original.document_path ? (
            <DocumentViewerModal documentUrl={row.original.document_path} documentData={row.original} />
          ) : (
            <DocumentUploadModal documentData={row.original} />
          );

          // Si es de hoy, añadir también un botón de editar
          if (isToday) {
            return (
              <div className="flex items-center gap-1">
                {documentComponent}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(row.original);
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
              </div>
            );
          }

          // Si no es de hoy, solo mostrar el componente de documento
          return documentComponent;
        }

        // Para otros estados, mostrar botones de editar/eliminar
        return (
          <div className={cn('flex gap-1', moment(row.original.date).isBefore(moment()) ? 'gap-0 justify-center' : '')}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row.original);
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
                  <ServiceDetailModal serviceData={row.original} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Ver detalle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DeleteConfirmationModal date={row.original.date} dailyReportId={row.original.id} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Eliminar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];
}

export function DayliReportDetailTable({
  dailyReport,
  savedVisibility,
  savedFilter,
  customers,
  employees,
  equipments,
  dailyReportId,
}: {
  dailyReportId: string;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
  customers: Awaited<ReturnType<typeof getCustomers>>;
  employees: Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>;
  equipments: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;
}) {
  const formattedData = transformDailyReports(dailyReport);
  const customerOptions = createFilterOptions(formattedData, (area) => area.customer);
  const servicesOptions = createFilterOptions(formattedData, (area) => area.services);
  const itemsOptions = createFilterOptions(formattedData, (area) => area.item);
  const allEmployeesName = formattedData?.flatMap((area) => area.employees).filter(Boolean);
  const employeesOptions = createFilterOptions(allEmployeesName, (name) => name);
  const allEquipmentName = formattedData?.flatMap((area) => area.equipment).filter(Boolean);
  const equipmentOptions = createFilterOptions(allEquipmentName, (name) => name);
  const allCustomerEquipmentName = formattedData
    ?.flatMap((area) => area.customer_equipment.map((eq) => eq.name))
    .filter(Boolean);
  const customerEquipmentOptions = createFilterOptions(allCustomerEquipmentName, (name) => name);

  const jornadaOptions = createFilterOptions(formattedData, (area) => area.working_day);
  const statusOptions = createFilterOptions(formattedData, (area) => area.status);
  const [selectedRow, setSelectedRow] = useState<(typeof formattedData)[0] | null>(null);
  const sectorOptions = createFilterOptions(formattedData, (area) => area.sector_service_name);
  const areaOptions = createFilterOptions(formattedData, (area) => area.areas_customer_name);
  const typeServiceOptions = createFilterOptions(formattedData, (area) => area.type_service);

  const handleEditRow = useCallback((row: (typeof formattedData)[0]) => {
    setSelectedRow(row);
    document.getElementById('open-button-daily-report')?.click();
  }, []);
  // Estado para controlar la apertura del modal
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DailyReportRow[]>([]);
  const router = useRouter();

  console.log(formattedData, formattedData);

  return (
    <>
      <div
        className={cn('flex justify-between items-center', dailyReport[0]?.status !== 'abierto' ? 'justify-end' : '')}
      >
        <DailyReportForm
          customers={customers}
          employees={employees}
          equipments={equipments}
          dailyReport={dailyReport}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          formattedData={formattedData}
          defaultValues={selectedRow}
          disabled={dailyReport[0]?.status !== 'abierto' && dailyReport[0]?.date !== moment().format('YYYY-MM-DD')}
        />
        <ClonarRegistrosButton formattedData={formattedData} selectedRows={selectedRows} />
      </div>
      <BaseDataTable
        className="mt-4"
        columns={getDailyReportColumns(handleEditRow)}
        data={formattedData || []}
        savedVisibility={savedVisibility}
        enableRowSelection={(row) => row.original.status !== 'ejecutado'}
        tableId="dailyReportTableDetail"
        onRowSelectionChange={(rows) => {
          console.log(rows);
          setSelectedRows(rows);
        }}
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],

          bulkAction: {
            enabled: true,
            label: 'Editar',
            icon: <Edit className="h-4 w-4" />,
            onClick: (rows) => {
              console.log(rows);
              setSelectedRows(rows);
              setIsBulkEditModalOpen(true);
            },
          },
          filterableColumns: [
            {
              columnId: 'Cliente',
              title: 'Cliente',
              options: customerOptions,
            },
            {
              columnId: 'Servicio',
              title: 'Servicio',
              options: servicesOptions,
            },
            {
              columnId: 'Item',
              title: 'Item',
              options: itemsOptions,
            },
            {
              columnId: 'Empleados',
              title: 'Empleados',
              options: employeesOptions,
            },
            {
              columnId: 'Equipo',
              title: 'Equipo',
              options: equipmentOptions,
            },
            {
              columnId: 'Jornada',
              title: 'Jornada',
              options: jornadaOptions,
            },
            {
              columnId: 'Tipo de servicio',
              title: 'Tipo de servicio',
              options: typeServiceOptions,
            },
            {
              columnId: 'Estado',
              title: 'Estado',
              options: statusOptions,
            },
            {
              columnId: 'Sector',
              title: 'Sector',
              options: sectorOptions,
            },
            {
              columnId: 'Área',
              title: 'Área',
              options: areaOptions,
            },
            {
              columnId: 'Equipo cliente',
              title: 'Equipo cliente',
              options: customerEquipmentOptions,
            },
          ],
        }}
      />
      {/* Modal de edición masiva */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedRows={selectedRows}
        onSuccess={() => {
          // Recargar datos o refrescar la tabla
          router.refresh();
          // O cualquier otra función que recargue los datos
        }}
      />
    </>
  );
}

export default DayliReportDetailTable;
