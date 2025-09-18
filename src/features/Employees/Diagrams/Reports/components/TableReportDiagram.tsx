'use client';
import { querySelectDistinct } from '@/app/server/GET/probando';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Calendar, FileText, User } from 'lucide-react';
import moment from 'moment';
import { fetchAllReportData, fetchEmployeesDiagramData } from '../lib/actions/report-actions';

type DiagramReportData = Awaited<ReturnType<typeof fetchEmployeesDiagramData>>['rows'][0];

function TableReportDiagram({
  initialData,
  savedFilters,
  savedVisibility,
}: {
  initialData?: Awaited<ReturnType<typeof fetchEmployeesDiagramData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllReportData({
      pageIndex: 0,
      pageSize: 1000000,
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: false,
    });
    return result.rows; // Solo devolver los datos, no la estructura de paginación
  };

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
      accessorKey: 'employees.cuil',
      id: 'employees.cuil',
      header: ({ column }) => <DataTableColumnHeader column={column} title="CUIL" />,
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.original?.employees?.cuil}</span>
          </div>
        );
      },
      enableHiding: false,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'employees.file',
      id: 'employees.file',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.original?.employees?.file}</span>
          </div>
        );
      },
      enableHiding: false,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'employees.lastname',
      id: 'employees.lastname',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {row.original?.employees?.lastname} {row.original?.employees?.firstname}
          </span>
        </div>
      ),
      enableHiding: false,
      filterFn: (row, id, value) => {
        const fullName =
          `${row.original?.employees?.lastname || ''} ${row.original?.employees?.firstname || ''}`.toLowerCase();
        return typeof value === 'string' ? fullName.includes(value.toLowerCase()) : false;
      },
    },
    {
      accessorKey: 'employees.company_positions.name',
      id: 'employees.company_positions.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Posición" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.employees.company_positions?.name || 'Sin posición'}</span>
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
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {moment(`${row.original.year}-${row.original.month}-${row.original.day}`).format('DD/MM/YYYY')}
            </span>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'diagram_type.short_description',
      id: 'diagram_type.short_description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Novedad" />,
      cell: ({ row }) => {
        const color = row.original.diagram_type.color;
        const description = row.original.diagram_type.short_description;

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
      accessorKey: 'diagram_type.name',
      id: 'diagram_type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{row.original.diagram_type?.name}</span>
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

  return (
    <BaseDataTable
      columns={columns}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="diagramReportsTable"
      serverSide={true}
      fetchData={fetchEmployeesDiagramData}
      fetchAllData={handleFetchAllData}
      queryKey="diagram-reports-supabase-server"
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        showExport: true,
        searchableColumns: [{ columnId: 'employees.lastname', placeholder: 'Buscar por nombre o apellido' }],
        filterableColumns: [
          {
            columnId: 'employees.cuil',
            title: 'Cuil',
            config: {
              tableName: 'employees_diagram',
              select: 'employees.cuil' as '*',
              relation: '{"employees": "employee_id"}',
              p_filters: { is_active: 'true' },
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'employees_diagram', 'employees.cuil'>>>
              ) => {
                const mappedData = data.map((value, index) => {
                  return {
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  };
                });

                return mappedData;
              },
            },
          },
          {
            columnId: 'employees.file',
            title: 'Legajo',
            config: {
              tableName: 'employees_diagram',
              select: 'employees.file' as '*',
              relation: '{"employees": "employee_id"}',
              p_filters: { is_active: 'true' },
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'employees_diagram', 'employees.file'>>>
              ) => {
                const mappedData = data.map((value, index) => {
                  return {
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  };
                });

                return mappedData;
              },
            },
          },
          {
            columnId: 'diagram_type.name',
            title: 'Tipo de novedad',
            config: {
              tableName: 'employees_diagram',
              select: 'diagram_type.name' as '*',
              relation: '{"diagram_type": "diagram_type"}',
              p_filters: { is_active: 'true' },
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'employees_diagram', 'diagram_type.name'>>>
              ) => {
                const mappedData = data.map((value, index) => {
                  return {
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  };
                });

                return mappedData;
              },
            },
          },
          // Eliminado filtro por Empleado (lastname) para evitar duplicidad con búsqueda por texto
          {
            columnId: 'employees.company_positions.name',
            title: 'Posición',
            config: {
              tableName: 'employees_diagram' as const,
              select: 'id' as '*',
              p_filters: { is_active: 'true' },
              multiJoinPaths: {
                joins: [
                  {
                    from_table: 'employees_diagram',
                    to_table: 'employees',
                    from_column: 'employee_id',
                    to_column: 'id',
                  },
                  {
                    from_table: 'employees',
                    to_table: 'company_positions',
                    from_column: 'company_position',
                    to_column: 'id',
                  },
                ],
                final_column: 'company_positions.name',
              },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees_diagram', 'id'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'date',
            title: 'Fecha',
            type: 'date-range',
            fromPlaceholder: 'Desde',
            toPlaceholder: 'Hasta',
          },
        ],
        showFilterOptions: true,
      }}
    />
  );
}

export default TableReportDiagram;
