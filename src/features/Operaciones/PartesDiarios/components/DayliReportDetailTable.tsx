'use client';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { cn } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, Table as TableType, VisibilityState } from '@tanstack/react-table';
import { Edit, Info } from 'lucide-react';
import moment from 'moment';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveEquipmentsForDailyReport,
  getAllActiveEmployeesForDailyReport,
  getCustomers,
  getDailyReportById,
} from '../actions/actions';
import { BulkEditModal } from './BulkEditModal';
import { ClonarRegistrosButton } from './ClonarRegistrosButton';
import { DailyReportForm } from './DailyReportRowForm';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import HistoryModal from './HistoryModal';
import { ServiceDetailModal } from './ServiceDetailModal';
export const transformDailyReports = (reports: Awaited<ReturnType<typeof getDailyReportById>>) => {
  const report = reports?.[0];
  return report?.dailyreportrows
    ?.map((row) => ({
      id: row.id,
      date: report.date,
      type_service: row.type_service,
      customer: row.customers?.name,
      preparte: row.preparte,
      cancel_reason: row.cancel_reason,
      employees: row.dailyreportemployeerelations.map(
        (rel) => rel.employees?.lastname + ' ' + rel.employees?.firstname
      ),
      equipment:
        row.dailyreportequipmentrelations.map(
          (rel) =>
            rel.vehicles?.domain ||
            rel.vehicles?.intern_number ||
            rel.other_equipment?.intern_number ||
            rel.other_equipment?.serial_number
        ) || [],
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
      completed_night: row.completed_night as boolean,
      completed_day: row.completed_day as boolean,
      areas_customer_id: row.service_areas?.id,
      areas_customer_name: row.service_areas?.areas_cliente?.descripcion_corta,
      description: row.description || '',
      document_path: row.document_path,
      remit_number: row.remit_number,
      employees_references: row.dailyreportemployeerelations.map((rel) => ({
        ...rel.employees,
        name: rel.employees?.lastname + ' ' + rel.employees?.firstname,
        id: rel.employees?.id,
        role: rel.role,
      })),
      equipment_references: row.dailyreportequipmentrelations
        .map((rel) => {
          const vehicle = rel.vehicles;
          const otherEquip = rel.other_equipment;
          if (vehicle) {
            return {
              ...vehicle,
              _source: 'vehicle' as const,
              name: vehicle.domain || vehicle.intern_number,
              id: vehicle.id,
            };
          }
          if (otherEquip) {
            return {
              ...otherEquip,
              _source: 'other_equipment' as const,
              name: otherEquip.intern_number || otherEquip.serial_number,
              id: otherEquip.id,
            };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item != null),
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
    }))
    .sort((a, b) => {
      // First sort by customer name
      const customerCompare = (a.customer || '').localeCompare(b.customer || '');
      if (customerCompare !== 0) return customerCompare;

      // Then sort by item name
      return (a.item || '').localeCompare(b.item || '');
    });
};

export type DailyReportRow = ReturnType<typeof transformDailyReports>[number];

// Función auxiliar para detectar empleados duplicados
const getDuplicatedEmployees = (data: DailyReportRow[]): Set<string> => {
  const employeeCounts = new Map<string, number>();

  data.forEach((row) => {
    row.employees.filter(Boolean).forEach((employee) => {
      if (employee) {
        employeeCounts.set(employee, (employeeCounts.get(employee) || 0) + 1);
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
const getDuplicatedEquipments = (data: DailyReportRow[]): Set<string> => {
  const equipmentCounts = new Map<string, number>();

  data.forEach((row) => {
    row.equipment.filter(Boolean).forEach((equipment) => {
      if (equipment) {
        equipmentCounts.set(equipment, (equipmentCounts.get(equipment) || 0) + 1);
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
  data: DailyReportRow[],
  employees: Awaited<ReturnType<typeof getAllActiveEmployeesForDailyReport>>
): Map<string, string> => {
  const unassignedMap = new Map<string, string>(); // employeeName -> customerId

  data.forEach((row) => {
    const customerId = row.data_to_clone?.customer_id;
    if (!customerId) return;

    row.employees_references?.forEach((empRef) => {
      if (!empRef.id) return;

      const employee = employees?.find((emp) => emp.id === empRef.id);
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
  data: DailyReportRow[],
  equipments: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>
): Map<string, string> => {
  const unassignedMap = new Map<string, string>(); // equipmentName -> customerId

  data.forEach((row) => {
    const customerId = row.data_to_clone?.customer_id;
    if (!customerId) return;

    row.equipment_references?.forEach((eqRef) => {
      if (!eqRef.id) return;

      const equipment = equipments?.find((eq) => eq.id === eqRef.id);
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

export function getDailyReportColumns(
  onEdit: (row: DailyReportRow) => void,
  allData: DailyReportRow[] = [],
  employees?: Awaited<ReturnType<typeof getAllActiveEmployeesForDailyReport>>,
  equipments?: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>
): ColumnDef<DailyReportRow>[] {
  const duplicatedEmployees = getDuplicatedEmployees(allData);
  const duplicatedEquipments = getDuplicatedEquipments(allData);
  const unassignedEmployees = employees ? getUnassignedEmployees(allData, employees) : new Map();
  const unassignedEquipments = equipments ? getUnassignedEquipments(allData, equipments) : new Map();
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium select-none text-nowrap">{row.original.customer}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'services',
      id: 'Servicio',
      header: ({ column, table }) => (
        <DataTableColumnHeader className="w-[130px]" column={column} table={table} title="Servicio" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.services}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'item',
      id: 'Item',
      header: ({ column, table }) => (
        <DataTableColumnHeader className="w-[130px]" column={column} table={table} title="Item" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.item}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    {
      accessorKey: 'sector_service_name',
      id: 'Sector',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Sector" />,
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Área" />,
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Tipo de servicio" />,
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Equipo cliente" />,
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Empleados" />,
      cell: ({ row }) => {
        const employees: string[] = row.original.employees;
        return (
          <div className="flex flex-wrap gap-1">
            {employees.filter(Boolean).map((employee) => {
              if (!employee) return null;
              const isDuplicated = duplicatedEmployees.has(employee);
              const isUnassigned = unassignedEmployees.has(employee);

              // Prioridad: duplicado > no asignado > normal
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

              // Determinar el mensaje del tooltip
              let tooltipMessage = '';
              if (isDuplicated) {
                tooltipMessage = 'Este empleado está asignado en múltiples filas del parte diario';
              } else if (isUnassigned) {
                tooltipMessage = 'Este empleado no está asignado al cliente de esta fila';
              } else {
                tooltipMessage = 'Empleado asignado correctamente';
              }

              return (
                <TooltipProvider key={employee} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge variant={badgeVariant} className={badgeClassName}>
                          {employee}
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
        // Aseguramos que ambos sean arrays
        if (!Array.isArray(rowValues) || !Array.isArray(value)) return false;
        // ¿Algún elemento de value está en rowValues?
        return value.some((val) => rowValues.includes(val));
      },
    },
    // PO-3: Columnas para Chofer/Ayudante en jornadas 12/24 hrs
    {
      accessorKey: 'chofer_dia',
      id: 'Chofer Día',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Chofer Día" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is12or24 = workingDay === 'jornada 12 horas' || workingDay === 'jornada 24 horas';
        if (!is12or24) return <span className="text-muted-foreground">-</span>;

        const choferDia = row.original.employees_references?.find((emp) => emp.role === 'chofer_dia');
        return choferDia?.name ? (
          <Badge variant="default" className="select-none text-nowrap dark:text-black">
            {choferDia.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Sin asignar</span>
        );
      },
    },
    {
      accessorKey: 'ayudante_dia',
      id: 'Ayudante Día',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Ayudante Día" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is12or24 = workingDay === 'jornada 12 horas' || workingDay === 'jornada 24 horas';
        if (!is12or24) return <span className="text-muted-foreground">-</span>;

        const ayudanteDia = row.original.employees_references?.find((emp) => emp.role === 'ayudante_dia');
        return ayudanteDia?.name ? (
          <Badge variant="default" className="select-none text-nowrap dark:text-black">
            {ayudanteDia.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground italic">Opcional</span>
        );
      },
    },
    {
      accessorKey: 'chofer_noche',
      id: 'Chofer Noche',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Chofer Noche" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is24 = workingDay === 'jornada 24 horas';
        if (!is24) return <span className="text-muted-foreground">-</span>;

        const choferNoche = row.original.employees_references?.find((emp) => emp.role === 'chofer_noche');
        return choferNoche?.name ? (
          <Badge variant="default" className="select-none text-nowrap dark:text-black">
            {choferNoche.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Sin asignar</span>
        );
      },
    },
    {
      accessorKey: 'ayudante_noche',
      id: 'Ayudante Noche',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Ayudante Noche" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is24 = workingDay === 'jornada 24 horas';
        if (!is24) return <span className="text-muted-foreground">-</span>;

        const ayudanteNoche = row.original.employees_references?.find((emp) => emp.role === 'ayudante_noche');
        return ayudanteNoche?.name ? (
          <Badge variant="default" className="select-none text-nowrap dark:text-black">
            {ayudanteNoche.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground italic">Opcional</span>
        );
      },
    },
    {
      accessorKey: 'equipment',
      id: 'Equipo',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Equipo" />,
      cell: ({ row }) => {
        const equipment = row.original.equipment;
        const equipmentRefs = row.original.equipment_references || [];
        return (
          <div className="flex flex-wrap gap-1">
            {equipment.filter(Boolean).map((equipmentItem) => {
              if (!equipmentItem) return null;
              const isDuplicated = duplicatedEquipments.has(equipmentItem);
              const isUnassigned = unassignedEquipments.has(equipmentItem);
              const eqRef = equipmentRefs.find((ref) => ref.name === equipmentItem);
              const condition = eqRef?.condition || 'operativo';
              const hasConditionIssue = ['no operativo', 'en reparacion'].includes(condition);
              const isNonStandardCondition = condition !== 'operativo';

              const conditionLabels: Record<string, string> = {
                'no operativo': 'No operativo',
                'en reparacion': 'En reparación',
                'operativo condicionado': 'Condicionado',
                'en preparacion': 'En preparación',
              };

              // Color - Prioridad: duplicado > condición crítica > no asignado > condición info > normal
              let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
              let badgeClassName = 'select-none text-nowrap';

              if (isDuplicated) {
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

              // Tooltip - combinar todos los desvíos (mismo formato que empleados)
              const tooltipMessages: string[] = [];
              if (hasConditionIssue) tooltipMessages.push(`Condición: ${conditionLabels[condition]}`);
              else if (isNonStandardCondition) tooltipMessages.push(`Condición: ${conditionLabels[condition]}`);
              if (isDuplicated) tooltipMessages.push('Asignado en múltiples filas del parte diario');
              if (isUnassigned) tooltipMessages.push('No asignado al cliente de esta fila');
              if (tooltipMessages.length === 0) tooltipMessages.push('Equipo asignado correctamente');

              return (
                <TooltipProvider key={equipmentItem} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={badgeVariant} className={badgeClassName}>
                        {equipmentItem}
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
            })}
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Jornada" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.working_day}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'start_time',
      id: 'Hora de inicio',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Hora de inicio" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.start_time}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'end_time',
      id: 'Hora de fin',
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Hora de fin" />,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.end_time}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      id: 'Estado',
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

        const is24Hours = row.original.working_day === 'jornada 24 horas';

        if (is24Hours && status !== 'ejecutado') {
          const completedDay = row.original.completed_day;
          const completedNight = row.original.completed_night;

          return (
            <Badge
              variant={completedDay || completedNight ? 'info' : variants[status as keyof typeof badgeVariants]}
              className={'font-medium capitalize'}
            >
              {completedDay || completedNight ? 'Ejecutado parcial' : status.replaceAll('_', ' ')}
            </Badge>
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
      header: ({ column, table }) => <DataTableColumnHeader column={column} table={table} title="Acciones" />,
      cell: ({ row }) => {
        // Comprobamos si la fecha es hoy
        const isToday = moment.utc(row.original.date).isSame(moment(), 'day');

        // Para otros estados, mostrar botones de editar/eliminar
        return (
          <div
            className={cn(
              'flex gap-1',
              moment.utc(row.original.date).isBefore(moment(), 'day') ? 'gap-0 justify-center' : ''
            )}
          >
            {(row.original.status !== 'ejecutado' || (isToday && row.original.status === 'ejecutado')) && (
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
                  <ServiceDetailModal reportDate={row.original.date} serviceData={row.original as any} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Ver detalle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {(isToday ||
              moment.utc(row.original.date).isAfter(moment()) ||
              row.original.status === 'sin_recursos_asignados') && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DeleteConfirmationModal dailyReportId={row.original.id} preparteInfo={row.original.preparte} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Eliminar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
  employeesPromise,
  equipmentsPromise,
  // dailyReportId,
}: {
  // dailyReportId: string;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
  customers: Awaited<ReturnType<typeof getCustomers>>;
  employeesPromise: ReturnType<typeof getAllActiveEmployeesForDailyReport>;
  equipmentsPromise: ReturnType<typeof getActiveEquipmentsForDailyReport>;
}) {
  // const dailyReport = await dailyReportPromise;
  const [formattedData, setFormattedData] = useState(transformDailyReports(dailyReport));
  const employees = use(employeesPromise);
  const equipments = use(equipmentsPromise);

  useEffect(() => {
    setFormattedData(transformDailyReports(dailyReport));
  }, [dailyReport]);
  const refetchDailyReport = async () => {
    const dailyReportetected = await getDailyReportById(dailyReport[0].id);
    setFormattedData(transformDailyReports(dailyReportetected));
  };
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

  // Referencia al objeto table de TanStack con el método clearRowSelection
  const tableRef = useRef<TableType<DailyReportRow> & { clearRowSelection?: (rowIds?: string[]) => void }>(null);

  const handleEditRow = useCallback((row: (typeof formattedData)[0]) => {
    setSelectedRow(row);
    document.getElementById('open-button-daily-report')?.click();
  }, []);
  // Estado para controlar la apertura del modal
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DailyReportRow[]>([]);
  // const router = useRouter();

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
          // selectedRow={selectedRow}
          // setSelectedRow={setSelectedRow}
          formattedData={formattedData}
          // defaultValues={selectedRow}
          refetchDailyReport={refetchDailyReport}
          disabled={dailyReport[0]?.status !== 'abierto' && dailyReport[0]?.date !== moment().format('YYYY-MM-DD')}
        />
        <ClonarRegistrosButton formattedData={formattedData} selectedRows={selectedRows} />
      </div>
      <BaseDataTable
        ref={tableRef}
        className="mt-4"
        columns={getDailyReportColumns(handleEditRow, formattedData, employees, equipments)}
        data={formattedData || []}
        savedVisibility={savedVisibility}
        enableRowSelection={(row) =>
          row.original.status !== 'ejecutado' &&
          row.original.status !== 'sin_recursos_asignados' &&
          row.original.status !== 'reprogramado'
        }
        tableId="dailyReportTableDetail"
        onRowSelectionChange={(rows) => {
          setSelectedRows(rows);
        }}
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],

          bulkAction: {
            enabled: true,
            label: 'Editar',
            icon: <Edit className="h-4 w-4" />,
            onClick: (rows) => {
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
        dailyReportId={dailyReport[0].id}
        onSuccess={(updatedRowIds?: string[]) => {
          // Los datos se actualizan automáticamente via invalidateQueries en el mutation hook
          // Solo necesitamos limpiar la selección local
          if (updatedRowIds && updatedRowIds.length > 0) {
            setSelectedRows((prev) => prev.filter((row) => !updatedRowIds.includes(row.id)));
          } else {
            setSelectedRows([]);
          }

          // Usar el método clearRowSelection del BaseDataTable para limpiar la selección interna
          if (tableRef.current?.clearRowSelection) {
            tableRef.current.clearRowSelection(updatedRowIds);
          }
        }}
      />
    </>
  );
}

export default DayliReportDetailTable;
