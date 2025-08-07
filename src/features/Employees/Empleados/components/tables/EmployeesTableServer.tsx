'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Mail, User } from 'lucide-react';
// import { fetchEmployeesData } from "@/lib/supabase-query"
import { fetchEmployeesData, querySelectDistinct } from '@/app/server/GET/probando';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import moment from 'moment';

// Tipo inferido automáticamente del retorno de Supabase
type EmployeeData = Awaited<ReturnType<typeof fetchEmployeesData>>['rows'][0];

export default function TablaEmployeesSupabase({
  initialData,
  savedFilters,
  savedVisibility,
}: {
  initialData: Awaited<ReturnType<typeof fetchEmployeesData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  // Definición de columnas
  const columns: ColumnDef<EmployeeData>[] = [
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
      accessorKey: 'lastname',
      id: 'lastname',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre completo" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 w-[200px]">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {row.original.lastname} {row.original.firstname}
          </span>
        </div>
      ),
      filterFn: (row, id, value) => {
        const fullName = `${row.original.firstname} ${row.original.lastname}`.toLowerCase();
        return fullName.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'email',
      id: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'nationality',
      id: 'nationality',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nacionalidad" />,
      cell: ({ row }) => {
        return <div>{row.original.nationality || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'born_date',
      id: 'born_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nacimiento" />,
      cell: ({ row }) => {
        return <div>{row.original.born_date ? moment(row.original.born_date).format('DD/MM/YYYY') : '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      //Cuil
      accessorKey: 'cuil',
      id: 'cuil',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cuil" />,
      cell: ({ row }) => {
        return <div>{row.original.cuil || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      //Tipo de documento
      accessorKey: 'document_type',
      id: 'document_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
      cell: ({ row }) => {
        return <div>{row.original.document_type}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'document_number',
      id: 'document_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => {
        return (
          <div className="flex gap-2 items-center">
            {/* <IdCardIcon /> */}
            {row.original.document_number}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'gender',
      id: 'gender',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Genero" />,
      cell: ({ row }) => {
        return <div>{row.original.gender || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.original.gender));
      },
    },
    {
      accessorKey: 'marital_status',
      id: 'marital_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado Civil" />,
      cell: ({ row }) => {
        return <div>{row.original.marital_status || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'level_of_education',
      id: 'level_of_education',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel de Educacion" />,
      cell: ({ row }) => {
        return <div>{row.original.level_of_education || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'street',
      id: 'street',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Calle" />,
      cell: ({ row }) => {
        return <div>{row.original.street || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'street_number',
      id: 'street_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Altura" />,
      cell: ({ row }) => {
        return <div>{row.original.street_number || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'provinces.name',
      id: 'provinces.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
      cell: ({ row }) => {
        return <div>{row.original.provinces?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'city',
      id: 'city',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
      cell: ({ row }) => {
        return <div>{row.original.cities?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'postal_code',
      id: 'postal_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="CP" />,
      cell: ({ row }) => {
        return <div>{row.original.postal_code || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'phone',
      id: 'phone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
      cell: ({ row }) => {
        return <div>{row.original.phone || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'file',
      id: 'file',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
      cell: ({ row }) => {
        return <div>{row.original.file || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'hierarchy.name',
      id: 'hierarchy.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) => {
        return <div>{row.original.hierarchy?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'company_positions.name',
      id: 'company_positions.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
      cell: ({ row }) => {
        return <div>{row.original.company_positions?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'work_diagram.name',
      id: 'work_diagram.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Diagrama" />,
      cell: ({ row }) => {
        return <div>{row.original.work_diagram?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      //Horas normales
      accessorKey: 'normal_hours',
      id: 'normal_hours',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Horas" />,
      cell: ({ row }) => {
        return <div>{row.original.normal_hours || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      //Tipo de contrato
      accessorKey: 'type_of_contract',
      id: 'type_of_contract',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Contrato" />,
      cell: ({ row }) => {
        return <div>{row.original.type_of_contract || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'contractor_employee.customers.name',
      id: 'contractor_employee.customers.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
      cell: ({ row }) => {
        const contractors = row.original.contractor_employee || [];

        // Si no hay contratistas, mostramos "Sin afectar"
        if (contractors.length === 0) {
          return <Badge>Sin afectar</Badge>;
        }

        // Define the contractor type
        // Get contractor names
        const contractorNames = contractors
          .map((contractor) => {
            if (typeof contractor === 'string') return contractor;
            return contractor?.customers?.name || '';
          })
          .filter((name): name is string => Boolean(name));

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
                    {contractorNames.map((name, index) => (
                      <span key={index}>{name}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, id, filterValue) => {
        // Si no hay filtro o el array está vacío, mostramos todas las filas
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
          return true;
        }

        const contractors = row.original.contractor_employee || [];

        console.log(contractors[0]?.customers);
        console.log(filterValue);

        // Si no hay contratistas, no mostramos la fila
        if (contractors.length === 0) {
          return false;
        }

        // Comprobamos si algún contratista coincide con el filtro
        return contractors.some((contractor) => {
          const name = contractor?.customers?.name;
          return name && filterValue.flat().includes(name);
        });
      },
    },

    {
      accessorKey: 'date_of_admission',
      id: 'date_of_admission',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de ingreso" />,
      cell: ({ row }) => {
        return (
          <div>
            {row.original.date_of_admission ? moment(row.original.date_of_admission).format('DD/MM/YYYY') : '-'}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'cost_center.name',
      id: 'cost_center.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Centro de costo" />,
      cell: ({ row }) => {
        return <div>{row.original.cost_center?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'affiliate_status',
      id: 'affiliate_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de afiliación" />,
      cell: ({ row }) => {
        return <div>{row.original.affiliate_status || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
        type StatusType = 'Completo' | 'Incompleto' | 'Completo con doc vencida' | 'default';

        const variantStatus: Record<StatusType, BadgeVariant> = {
          Completo: 'success',
          Incompleto: 'destructive',
          'Completo con doc vencida': 'yellow',
          default: 'default',
        };
        return (
          <Badge
            variant={row.original.status ? variantStatus[row.original.status as StatusType] || 'default' : 'default'}
            className="capitalize"
          >
            {row.original.status || 'Sin estado'}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
  ];

  const columnKeys = columns.reduce(
    (acc, column) => {
      if (column.id) {
        acc[column.id] = column.id;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  // console.log(datas,'datas')

  return (
    <BaseDataTable
      columns={columns}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="activeEmployeesServerTable"
      enableRowSelection={true}
      // Configuración para server-side con Supabase
      serverSide={true}
      fetchData={fetchEmployeesData}
      queryKey="active-employees-supabase"
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        filterableColumns: [
          {
            columnId: 'gender',
            title: 'Genero',
            config: {
              tableName: 'employees',
              select: 'gender' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'gender'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.marital_status,
            title: 'Estado Civil',
            config: {
              tableName: 'employees',
              select: 'marital_status' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'marital_status'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.nationality,
            title: 'Nacionalidad',
            config: {
              tableName: 'employees',
              select: 'nationality' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'nationality'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.document_type,
            title: 'Tipo de Documento',
            config: {
              tableName: 'employees',
              select: 'document_type' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'document_type'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.level_of_education,
            title: 'Nivel de Educación',
            config: {
              tableName: 'employees',
              select: 'level_of_education' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'level_of_education'>>>) => {
                console.log(data, 'nivel');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'provinces.name',
            title: 'Provincia',
            config: {
              tableName: 'employees',
              select: 'provinces.name' as '*',
              relation: '{"provinces": "province"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'provinces.name'>>>) => {
                console.log(data, 'provinves');

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
            columnId: 'hierarchy.name',
            title: 'Sector',
            config: {
              tableName: 'employees',
              select: 'hierarchy.name' as '*',
              relation: '{"hierarchy": "hierarchical_position"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'hierarchy', 'name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'company_positions.name',
            title: 'Puesto',
            config: {
              tableName: 'employees',
              select: 'company_positions.name' as '*',
              relation: '{"company_positions": "company_position"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'company_positions', 'name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'work_diagram.name',
            title: 'Diagrama',
            config: {
              tableName: 'employees',
              select: 'work_diagram.name' as '*',
              relation: '{"work_diagram": "workflow_diagram"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'work_diagram.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.type_of_contract,
            title: 'Tipo de Contrato',
            config: {
              tableName: 'employees',
              select: 'type_of_contract' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'type_of_contract'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'contractor_employee.customers.name',
            title: 'Afectaciones',
            config: {
              tableName: 'employees' as const,
              select: 'id' as '*',
              multiJoinPaths: {
                joins: [
                  {
                    from_table: 'employees',
                    to_table: 'contractor_employee',
                    from_column: 'id',
                    to_column: 'employee_id',
                  },
                  {
                    from_table: 'contractor_employee',
                    to_table: 'customers',
                    from_column: 'contractor_id',
                    to_column: 'id',
                  },
                ],
                final_column: 'customers.name',
              },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'id'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'cost_center.name',
            title: 'Centro de Costo',
            config: {
              tableName: 'employees',
              select: 'cost_center.name' as '*',
              relation: '{"cost_center": "cost_center_id"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'cost_center.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.affiliate_status,
            title: 'Estado de Afiliación',
            config: {
              tableName: 'employees',
              select: 'affiliate_status' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'affiliate_status'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: columnKeys.status,
            title: 'Estado',
            config: {
              tableName: 'employees',
              select: 'status' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'employees', 'status'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
        ],
        showFilterOptions: true,
      }}
    />
  );
}
