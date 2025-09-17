'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import moment from 'moment';
import { useState } from 'react';
import { getCurrentAbsentEmployees } from '../../actions/actions';
import { EmployeeAbsenceTableComponent } from './employee-absence-table';

interface DailyAbsence {
  fecha: string;
  dotacion: number;
  altas: number;
  bajas: number;
  vacaciones: number;
  totalDotacion: number;
  totalAusentes: number;
  porcentajeAusentismo: number;
}

interface DetailedAbsenceTableProps {
  data: DailyAbsence[];
  savedVisibility: Record<string, boolean>;
  savedFiltersFromCookie: string[];
}

// Tipado de la respuesta de la API
interface EmployeeAbsence {
  legajo: number;
  nombre: string;
  tarea: string;
  linea: string;
  turno: string;
  motivo: string;
  desde: string;
  hasta: string;
  observaciones: string;
  diasCaidos: number;
  employee_id?: string;
}

function getDetailedColumns(): ColumnDef<DailyAbsence>[] {
  return [
    {
      accessorKey: 'fecha',
      id: 'Fecha',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'dotacion',
      id: 'Dotación',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dotación" />,
      cell: ({ getValue }) => <div className="">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'altas',
      id: 'Altas',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Altas" />,
      cell: ({ getValue }) => <div className=" text-green-600">{getValue<number>() || '-'}</div>,
    },
    {
      accessorKey: 'bajas',
      id: 'Bajas',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bajas" />,
      cell: ({ getValue }) => <div className=" text-red-600">{getValue<number>() || '-'}</div>,
    },
    {
      accessorKey: 'totalDotacion',
      id: 'Total Dotación',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Dotación" />,
      cell: ({ getValue }) => <div className=" font-medium">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'totalAusentes',
      id: 'Total Ausentes',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Ausentes" />,
      cell: ({ getValue }) => <div className="">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'porcentajeAusentismo',
      id: '% Ausentismo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="% Ausentismo" />,
      cell: ({ getValue }) => {
        const p = getValue<number>() ?? 0;
        const cls =
          p > 3 ? 'bg-red-100 text-red-800' : p > 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        return (
          <div className="">
            <span className={`px-2 py-1 rounded text-xs ${cls}`}>{p.toFixed(2)}%</span>
          </div>
        );
      },
    },
  ];
}

export function DetailedAbsenceTableComponent({
  data,
  savedVisibility,
  savedFiltersFromCookie,
}: DetailedAbsenceTableProps) {
  const tableId = 'detailedAbsenceTable';
  const fechaOptions = createFilterOptions(data, (d) => d.fecha);

  // Estado del modal y carga de detalle por fecha
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeAbsence[]>([]);
  const [detalles, setDetalles] = useState<{
    altas_info?: EmployeeAbsence[];
    bajas_info?: EmployeeAbsence[];
    ausentes_info?: EmployeeAbsence[];
  } | null>(null);

  // Lectura de cookies para la tabla de empleados dentro del modal
  const employeeTableId = 'employeeAbsenceTable';
  const visibilityCookie = Cookies.get(employeeTableId);
  const filtersCookie = Cookies.get(`${employeeTableId}-filters`);
  const savedVisibilityEmployees = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersEmployees = filtersCookie ? JSON.parse(filtersCookie) : [];

  const handleRowClick = async (row: DailyAbsence) => {
    try {
      setSelectedDate(row.fecha);
      setIsOpen(true);
      setLoading(true);
      setError(null);

      // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para la función RPC
      const [day, month, year] = row.fecha.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const data: any = await getCurrentAbsentEmployees({ date: isoDate });
      // data puede venir como { data: EmployeeAbsence[], detalles: { ... } } según el RPC
      if (data?.detalles) {
        setDetalles(data.detalles);
        setEmployees(data.data || data.detalles.ausentes_info || []);
      } else {
        setDetalles(null);
        setEmployees(data?.data || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Error desconocido');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BaseDataTable
        columns={getDetailedColumns()}
        data={data}
        savedVisibility={savedVisibility}
        tableId={tableId}
        onRowClick={handleRowClick}
        toolbarOptions={{
          initialVisibleFilters: savedFiltersFromCookie,
          filterableColumns: [
            {
              columnId: 'Fecha',
              title: 'Fecha',
              options: fechaOptions,
            },
          ],
        }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Empleados ausentes {selectedDate ? `el ${moment(selectedDate).format('DD/MM/YYYY')}` : ''}
            </DialogTitle>
            <DialogDescription>Detalle de empleados ausentes en la fecha seleccionada.</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : !detalles ? (
            employees.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No hay empleados para esta fecha.</div>
            ) : (
              <EmployeeAbsenceTableComponent
                data={employees}
                savedVisibility={savedVisibilityEmployees}
                savedFiltersFromCookie={savedFiltersEmployees}
              />
            )
          ) : (
            <Tabs
              defaultValue={
                (detalles?.bajas_info?.length || 0) > 0
                  ? 'bajas'
                  : (detalles?.ausentes_info?.length || 0) > 0
                    ? 'ausentes'
                    : (detalles?.altas_info?.length || 0) > 0
                      ? 'altas'
                      : 'ausentes'
              }
              className="w-full"
            >
              <TabsList>
                <TabsTrigger disabled={(detalles.bajas_info?.length || 0) < 1} value="bajas">
                  Bajas ({detalles?.bajas_info?.length || 0})
                </TabsTrigger>
                <TabsTrigger disabled={(detalles.ausentes_info?.length || 0) < 1} value="ausentes">
                  Ausentes ({detalles?.ausentes_info?.length || 0})
                </TabsTrigger>
                <TabsTrigger disabled={(detalles.altas_info?.length || 0) < 1} value="altas">
                  Altas ({detalles?.altas_info?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bajas" className="mt-4">
                {detalles?.bajas_info && detalles.bajas_info.length > 0 ? (
                  <EmployeeAbsenceTableComponent
                    data={detalles.bajas_info}
                    savedVisibility={savedVisibilityEmployees}
                    savedFiltersFromCookie={savedFiltersEmployees}
                  />
                ) : (
                  <div className="py-6 text-center text-muted-foreground">Sin bajas para esta fecha.</div>
                )}
              </TabsContent>

              <TabsContent value="ausentes" className="mt-4">
                {detalles?.ausentes_info && detalles.ausentes_info.length > 0 ? (
                  <EmployeeAbsenceTableComponent
                    data={detalles.ausentes_info}
                    savedVisibility={savedVisibilityEmployees}
                    savedFiltersFromCookie={savedFiltersEmployees}
                  />
                ) : (
                  <div className="py-6 text-center text-muted-foreground">Sin ausentes para esta fecha.</div>
                )}
              </TabsContent>

              <TabsContent value="altas" className="mt-4">
                {detalles?.altas_info && detalles.altas_info.length > 0 ? (
                  <EmployeeAbsenceTableComponent
                    data={detalles.altas_info}
                    savedVisibility={savedVisibilityEmployees}
                    savedFiltersFromCookie={savedFiltersEmployees}
                  />
                ) : (
                  <div className="py-6 text-center text-muted-foreground">Sin altas para esta fecha.</div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
