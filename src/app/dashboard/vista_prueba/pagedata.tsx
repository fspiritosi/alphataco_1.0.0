'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit, Mail, User } from 'lucide-react';
import { useState } from 'react';
// import { fetchEmployeesData } from "@/lib/supabase-query"
import { fetchEmployeesData } from '@/app/server/GET/probando';
import { Card } from '@/components/ui/card';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Crear cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

// Tipo inferido automáticamente del retorno de Supabase
type EmployeeData = Awaited<ReturnType<typeof fetchEmployeesData>>['rows'][0];

function TablaEmployeesSupabase({ initialData }: { initialData: Awaited<ReturnType<typeof fetchEmployeesData>> }) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);

  const handleEdit = (employee: EmployeeData) => {
    setSelectedEmployee(employee);
    console.log('Editando empleado:', employee);
  };

  const handleDelete = (employee: EmployeeData) => {
    console.log('Eliminando empleado:', employee);
  };

  const handleBulkAction = (selectedRows: EmployeeData[]) => {
    console.log('Acción masiva en:', selectedRows);
  };

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
      accessorKey: 'firstname',
      id: 'firstname',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {row.original.firstname} {row.original.lastname}
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
      accessorKey: 'created_at',
      id: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Creación" />,
      cell: ({ row }) => {
        const fecha = new Date(row.original.created_at);
        return fecha.toLocaleDateString('es-ES');
      },
    },
  ];

  // Opciones de filtro estáticas
  const statusOptions = [
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <Card className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Empleados (Supabase)</h1>
          <p className="text-muted-foreground mt-2">Tabla con paginación del lado del servidor usando Supabase</p>
        </div>

        {selectedEmployee && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Empleado seleccionado:</strong> {selectedEmployee.first_name} {selectedEmployee.last_name} -{' '}
              {selectedEmployee.email}
            </p>
          </div>
        )}

        <BaseDataTable
          columns={columns}
          savedVisibility={{}}
          initialData={initialData}
          tableId="employeesSupabaseTable"
          enableRowSelection={true}
          onRowClick={(row) => {
            console.log('Fila clickeada:', row);
          }}
          // Configuración para server-side con Supabase
          serverSide={true}
          fetchData={fetchEmployeesData}
          queryKey="employees-supabase"
          toolbarOptions={{
            initialVisibleFilters: ['firstname'],
            searchableColumns: [
              {
                columnId: 'firstname',
                placeholder: 'Buscar por nombre...',
              },
              {
                columnId: 'email',
                placeholder: 'Buscar por email...',
              },
            ],
            filterableColumns: [
              {
                columnId: 'status',
                title: 'Estado',
                options: statusOptions,
              },
              {
                columnId: 'created_at',
                title: 'Fecha de Creación',
                type: 'date-range',
                fromPlaceholder: 'Desde',
                toPlaceholder: 'Hasta',
              },
            ],
            showViewOptions: true,
            showFilterOptions: true,
            showExport: true,
            bulkAction: {
              enabled: true,
              label: 'Acción masiva',
              icon: <Edit className="h-4 w-4" />,
              onClick: handleBulkAction,
            },
            extraActions: (table) => (
              <Button variant="default" size="sm">
                <User className="mr-2 h-4 w-4" />
                Nuevo Empleado
              </Button>
            ),
          }}
        />
      </Card>
    </QueryClientProvider>
  );
}

export default function EjemploTablaEmployeesSupabase({
  initialData,
}: {
  initialData: Awaited<ReturnType<typeof fetchEmployeesData>>;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TablaEmployeesSupabase initialData={initialData} />
    </QueryClientProvider>
  );
}
