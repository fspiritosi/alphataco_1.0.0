'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useState } from 'react';
import { EmployeeAbsenceTableComponent } from './employee-absence-table';

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
  id?: string; // opcional para enlazar al detalle del empleado
}

interface DepartmentData {
  sector: string;
  dotacion: number;
  ausentes: number;
  porcentaje: number;
  data?: EmployeeAbsence[]; // lista de ausentes por sector
}

interface DepartmentSummaryTableProps {
  data: DepartmentData[];
  savedVisibility: Record<string, boolean>;
  savedFiltersFromCookie: string[];
}

function getDepartmentColumns(): ColumnDef<DepartmentData>[] {
  return [
    {
      accessorKey: 'sector',
      id: 'Sector',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
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
      accessorKey: 'ausentes',
      id: 'Ausentes',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ausentes" />,
      cell: ({ getValue }) => <div className="">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'porcentaje',
      id: '%',
      header: ({ column }) => <DataTableColumnHeader column={column} title="%" />,
      cell: ({ getValue }) => {
        const p = getValue<number>() ?? 0;
        const cls =
          p > 5 ? 'bg-red-100 text-red-800' : p > 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        return (
          <div className="">
            <span className={`px-2 py-1 rounded text-xs ${cls}`}>{p.toFixed(2)}%</span>
          </div>
        );
      },
    },
  ];
}

export function DepartmentSummaryTableComponent({
  data,
  savedVisibility,
  savedFiltersFromCookie,
}: DepartmentSummaryTableProps) {
  const tableId = 'departmentSummaryTable';
  const sectorOptions = createFilterOptions(data, (d) => d.sector);

  // Estado del modal y empleados a mostrar
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeAbsence[]>([]);

  // Lectura de cookies para la tabla de empleados dentro del modal
  const employeeTableId = 'employeeAbsenceTable';
  const visibilityCookie = Cookies.get(employeeTableId);
  const filtersCookie = Cookies.get(`${employeeTableId}-filters`);
  const savedVisibilityEmployees = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersEmployees = filtersCookie ? JSON.parse(filtersCookie) : [];

  const handleRowClick = (row: DepartmentData) => {
    setSelectedSector(row.sector);

    const mapped = (row.data || []).map((d: any) => ({
      ...d,
      id: d?.id ?? d?.employee_id ?? undefined,
      legajo: typeof d?.legajo === 'string' ? Number(d.legajo) : d?.legajo,
    })) as EmployeeAbsence[];

    setEmployees(mapped);
    setIsOpen(true);
  };

  return (
    <>
      <BaseDataTable
        columns={getDepartmentColumns()}
        data={data}
        savedVisibility={savedVisibility}
        tableId={tableId}
        onRowClick={handleRowClick}
        toolbarOptions={{
          initialVisibleFilters: savedFiltersFromCookie,
          filterableColumns: [
            {
              columnId: 'Sector',
              title: 'Sector',
              options: sectorOptions,
            },
          ],
        }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedSector ? `Ausentes en ${selectedSector}` : 'Ausentes'}</DialogTitle>
            <DialogDescription>Detalle de empleados ausentes en el sector seleccionado.</DialogDescription>
          </DialogHeader>

          {employees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hay ausentes para este sector.</div>
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
