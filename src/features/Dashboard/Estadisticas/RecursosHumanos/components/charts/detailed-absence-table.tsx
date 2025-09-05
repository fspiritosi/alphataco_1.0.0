'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import moment from 'moment';
import { useState } from 'react';
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
}

interface DailyAbsenceDetailApiResponse {
  data: EmployeeAbsence[];
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

      const params = new URLSearchParams();
      if (row.fecha) params.set('date', moment(row.fecha).format('YYYY-MM-DD'));
      const res = await fetch(`/api/hr/daily-absence-detail?${params.toString()}`);
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Error al obtener el detalle de ausencias');
      }
      const json: DailyAbsenceDetailApiResponse = await res.json();
      setEmployees(Array.isArray(json?.data) ? json.data : []);
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
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hay empleados ausentes para esta fecha.</div>
          ) : (
            <EmployeeAbsenceTableComponent
              data={employees}
              savedVisibility={savedVisibilityEmployees}
              savedFiltersFromCookie={savedFiltersEmployees}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
