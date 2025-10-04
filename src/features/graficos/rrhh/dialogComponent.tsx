import { EmployeeNotInDailyReportType } from '@/app/server/GET/actions';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { Clock } from 'lucide-react';
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
  employeesNotInDailyReport: EmployeeNotInDailyReportType[];
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  disponibleEmployeesPorcent: number;
  condiciones_indicadores: any;
}) {
  const cookiesStore = Cookies.get('position-filter')?.split(',');
  const columns = useMemo<ColumnDef<EmployeeNotInDailyReportType>[]>(
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
        {/* <div className="mt-4">
            {employeesNotInDailyReport && employeesNotInDailyReport.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 font-semibold text-sm border-b pb-2">
                  <div>Nombre</div>
                  <div>CUIL</div>
                  <div>Posición</div>
                  <div>Diagrama</div>
                </div>
                {employeesNotInDailyReport.map((employee: any, index: number) => (
                  <div
                    key={employee.employee_id || index}
                    className="grid grid-cols-4 gap-4 text-sm py-2 border-b hover:bg-gray-50"
                  >
                    <div className="font-medium">
                      {employee.lastname}, {employee.firstname}
                    </div>
                    <div className="text-gray-600">{employee.cuil}</div>
                    <div className="text-gray-600">{employee.position_name || 'Sin posición'}</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: employee.diagram_color }}
                      ></span>
                      <span className="text-gray-600">{employee.diagram_short_description}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No hay empleados disponibles</div>
            )}
          </div> */}
      </DialogContent>
    </Dialog>
  );
}
