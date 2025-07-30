'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, FileText, User } from 'lucide-react';
import { useState } from 'react';
import {
  fetchCompanyPositionsForReportsType,
  fetchEmployeesForReportsType,
  fetchNoveltyTypesForReportsType,
} from './DiagramReportsWrapper';
import { fetchDiagramReportsData } from './actions/action';

// Tipo inferido automáticamente del retorno de la función
type DiagramReportData = Awaited<ReturnType<typeof fetchDiagramReportsData>>['rows'][0];

interface DiagramReportsTableProps {
  initialData: Awaited<ReturnType<typeof fetchDiagramReportsData>>;
  employees?: fetchEmployeesForReportsType;
  noveltyTypes?: fetchNoveltyTypesForReportsType;
  companyPositions?: fetchCompanyPositionsForReportsType;
  savedFilters: string[];
}

function DiagramReportsTableComponent({
  initialData,
  employees = [],
  noveltyTypes = [],
  companyPositions = [],
  savedFilters,
}: DiagramReportsTableProps) {
  const [selectedReport, setSelectedReport] = useState<DiagramReportData | null>(null);

  console.log(initialData, 'initialData');
  // Definición de columnas
  const columns: ColumnDef<DiagramReportData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'employee_cuil',
      id: 'employee_cuil',
      header: ({ column }) => <DataTableColumnHeader column={column} title="CUIL" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('employee_cuil')}</span>
        </div>
      ),
      enableHiding: false,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'employee_name',
      id: 'employee_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('employee_name')}</span>
        </div>
      ),
      enableHiding: false,
      filterFn: (row, id, value) => {
        const name = row.getValue(id) as string;
        return name.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'company_position',
      id: 'company_position',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Posición" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('company_position') || 'Sin posición'}</span>
        </div>
      ),
      enableHiding: false,
      filterFn: (row, id, value) => {
        const position = row.getValue(id) as string;
        return position?.toLowerCase().includes(value.toLowerCase()) || false;
      },
    },
    {
      accessorKey: 'date',
      id: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('date')}</span>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'novelty_short_description',
      id: 'Novedad',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Novedad" />,
      cell: ({ row }) => {
        const color = row.original.novelty_color;
        const description = row.getValue('Novedad') as string;

        return (
          <Badge
            variant="outline"
            style={{
              color: color,
              borderColor: color,
              backgroundColor: `${color}10`,
            }}
          >
            {description}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      enableSorting: false,
    },
    {
      accessorKey: 'novelty_name',
      id: 'Tipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{row.original.novelty_name}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      enableSorting: true,
      invertSorting: true,
    },
  ];

  const employeeOptions = employees.map((emp) => ({
    label: `${emp.lastname
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')} ${emp.firstname
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')} (${emp.cuil})`,
    value: emp.id,
  }));

  const noveltyTypeOptions = noveltyTypes.map((type) => ({
    label: type.name || '',
    value: type.name || '',
  }));

  const companyPositionOptions = companyPositions.map((position) => ({
    label: position.name || '',
    value: position.name || '',
  }));

  return (
    <div className="">
      {selectedReport && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Reporte seleccionado:</strong> {selectedReport.employee_name} - {selectedReport.date} -{' '}
            {selectedReport.novelty_short_description}
          </p>
        </div>
      )}

      <BaseDataTable
        columns={columns}
        savedVisibility={{}}
        initialData={initialData}
        tableId="diagramReportsTable"
        enableRowSelection={true}
        serverSide={true}
        fetchData={fetchDiagramReportsData}
        queryKey="diagram-reports"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          filterableColumns: [
            {
              columnId: 'employee_name',
              title: 'Empleados',
              options: employeeOptions,
            },
            {
              columnId: 'Tipo',
              title: 'Tipos de Novedad',
              options: noveltyTypeOptions,
            },
            {
              columnId: 'company_position',
              title: 'Posición',
              options: companyPositionOptions,
            },
            {
              columnId: 'date',
              title: 'Fecha',
              type: 'date-range',
              fromPlaceholder: 'Desde',
              toPlaceholder: 'Hasta',
            },
          ],
          showViewOptions: true,
          showFilterOptions: true,
          showExport: true,
        }}
      />
    </div>
  );
}

export default function DiagramReportsTable(props: DiagramReportsTableProps) {
  return <DiagramReportsTableComponent {...props} />;
}
