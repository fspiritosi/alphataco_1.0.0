import { EmployeeNotInDailyReportType } from '@/app/server/GET/actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createNestedFilterOptions } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Building, Clock } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

export default function DialogComponent({
  disponibleEmployeesNumber,
  employeesNotInDailyReport,
  isDialogOpen,
  setIsDialogOpen,
  disponibleEmployeesPorcent,
  condiciones_indicadores,
}: {
  disponibleEmployeesNumber: number;
  employeesNotInDailyReport: EmployeeNotInDailyReportType;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  disponibleEmployeesPorcent: number;
  condiciones_indicadores: any;
}) {
  const columns = useMemo<ColumnDef<EmployeeNotInDailyReportType[number]>[]>(
    () => [
      {
        accessorKey: 'lastname',
        header: 'Nombre',
        cell: ({ row }) => (
          <div className="font-medium hover:underline">
            <Link
              href={`/dashboard/employee/action?action=view&employee_id=${row.original.employee_id}`}
              target="_blank"
            >
              {row.original.lastname}, {row.original.firstname}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: 'cuil',
        header: 'CUIL',
        cell: ({ row }) => <div className="text-gray-600">{row.getValue('cuil')}</div>,
      },
      {
        accessorKey: 'position_name',
        header: 'Posición',
        id: 'position_name',
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        cell: ({ row }) => <div className="text-gray-600">{row.getValue('position_name') || 'Sin posición'}</div>,
      },
      {
        accessorKey: 'customers',
        header: 'Clientes',
        id: 'customers',
        filterFn: (row, id, filterValue) => {
          // Si no hay filtro o el array está vacío, mostramos todas las filas
          if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
            return true;
          }

          const contractors: any = row.original.customers || [];

          // Si no hay contratistas, no mostramos la fila
          if (contractors.length === 0) {
            return false;
          }

          // Comprobamos si algún contratista coincide con el filtro
          return contractors.some((contractor: any) => {
            const name = contractor?.customer_name;
            return name && filterValue.flat().includes(name);
          });
        },
        exportFormatter: (value: any, row: any) => {
          const contractors = row.original?.customers
            ?.map((contractor: any) => contractor?.customer_name || '')
            .filter(Boolean);
          return contractors && contractors.length > 0 ? contractors.join(', ') : 'Sin afectar';
        },
        cell: ({ row }) => {
          const contractors: any = row.original.customers || [];

          // Si no hay contratistas, mostramos "Sin afectar"
          if (contractors.length === 0) {
            return <Badge>Sin afectar</Badge>;
          }

          // Define the contractor type
          // Get contractor names
          const contractorNames = (contractors as any)
            .map((contractor: any) => {
              if (typeof contractor === 'string') return contractor;
              return contractor?.customer_name || '';
            })
            .filter((name: any): name is string => Boolean(name));

          const firstContractor = contractorNames[0] || '—';

          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex">
                    <Badge>
                      {firstContractor}
                      {contractorNames.length > 1 && ` +${contractorNames.length - 1}`}
                    </Badge>
                  </div>
                </TooltipTrigger>
                {contractorNames.length > 1 && (
                  <TooltipContent className="text-white bg-black rounded-lg p-2">
                    <div className="flex flex-col gap-1">
                      {contractorNames.map((name: any, index: any) => (
                        <span key={index}>{name}</span>
                      ))}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: 'diagram_short_description',
        header: 'Diagrama',
        id: 'diagram_short_description',
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.original.diagram_color }}></span>
            <span className="text-gray-600">{row.getValue('diagram_short_description')}</span>
          </div>
        ),
      },
    ],
    []
  );
  const positions = createFilterOptions(employeesNotInDailyReport, (employee) => employee.position_name);
  const diagrams = createFilterOptions(employeesNotInDailyReport, (employee) => employee.diagram_short_description);
  const customers = createNestedFilterOptions(
    employeesNotInDailyReport,
    (customer: any) => customer?.customers?.map((contractor: any) => contractor?.customer_name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card
          className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors duration-200 hover:cursor-pointer"
          variant={
            Math.round(disponibleEmployeesPorcent) !== 0
              ? Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.success
                ? 'success'
                : Math.round(disponibleEmployeesPorcent) >= condiciones_indicadores.warning
                  ? 'warning'
                  : 'destructive'
              : 'destructive'
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Disponibles</p>
                <p className="text-xl font-bold text-gray-900">{disponibleEmployeesNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-[70vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Empleados Disponibles ({disponibleEmployeesNumber})</DialogTitle>
          <DialogDescription>
            Lista de empleados que tienen diagrama activo pero no están asignados al parte diario de hoy.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 overflow-hidden">
          {employeesNotInDailyReport && employeesNotInDailyReport.length > 0 ? (
            <BaseDataTable
              columns={columns}
              data={employeesNotInDailyReport}
              //   onRowClick={(column) => {
              //     router.push(`dashboard/employee/action?action=view&employee_id=${column.employee_id}`);
              //   }}
              toolbarOptions={{
                initialVisibleFilters: [],
                searchableColumns: [
                  { columnId: 'lastname', placeholder: 'Buscar por nombre...' },
                  { columnId: 'cuil', placeholder: 'Buscar por CUIL...' },
                ],
                filterableColumns: [
                  {
                    columnId: 'position_name',
                    title: 'Posición',
                    options: positions,
                  },
                  {
                    columnId: 'diagram_short_description',
                    title: 'Diagrama',
                    options: diagrams,
                  },
                  {
                    columnId: 'customers',
                    title: 'Clientes',
                    options: customers,
                  },
                ],
                showViewOptions: true,
              }}
              tableId="empleados-disponibles-table"
              savedVisibility={{ lastname: true, cuil: true }}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">No hay empleados disponibles</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
