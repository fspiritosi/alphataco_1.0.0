'use client';
// import { BaseModal } from '@/features/Empresa/RRHH/components/rrhh/baseModal';
// import WorkDiagramForm from '@/features/Empresa/RRHH/components/rrhh/work-diagram-form';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
// import { columns, type Diagram } from './column';
// import { DataTable } from './data-table';
import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { fetchAllWorkDiagrams } from './actions/actions';
// interface DiagramType {
//   id: string;
//   created_at: string;
//   name: string;
//   company_id: string;
//   color: string;
//   short_description: string;
//   work_active: boolean;
// }
// interface Diagram {
//   id: string;
//   created_at: string;
//   name: string;
//   work_active: boolean;
//   active_novelty: string;
//   inactive_novelty: string;
// }
interface Diagram {
  id: string;
  created_at: string;
  name: string;
  is_active: boolean;
  active_working_days: number;
  inactive_working_days: number;
  active_novelty: string;
  inactive_novelty: string;
}

// <TableHead className="w-[180px]">Nombre</TableHead>
// <TableHead className="w-[180px]">Días activos</TableHead>
// <TableHead className="w-[180px]">Días inactivos</TableHead>
// <TableHead className="w-[180px]">Estado</TableHead>
// <TableHead className="w-[180px]">Novedad activa</TableHead>
// <TableHead className="w-[180px]">Novedad inactiva</TableHead>
// <TableHead>Acciones</TableHead>

export function getDiagramColumns(
  onEdit: (diagram: Awaited<ReturnType<typeof fetchAllWorkDiagrams>>[number]) => void
): ColumnDef<Awaited<ReturnType<typeof fetchAllWorkDiagrams>>[number]>[] {
  return [
    {
      accessorKey: 'name',
      id: 'Nombre',
      // header: () => <span className="w-[200px]">Nombre</span>,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'active_working_days',
      id: 'Días activos',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Días activos" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'inactive_working_days',
      id: 'Días inactivos',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Días inactivos" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'is_active',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      accessorKey: 'active_novelty.name',
      id: 'Novedad activa',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Novedad activa" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'inactive_novelty.name',
      id: 'Novedad inactiva',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Novedad inactiva" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    },
  ];
}

export default function ListDiagrams({
  diagramsTypes,
  onEdit,
  onModeChange,
  data,
  savedVisibility,
  savedFilter,
}: {
  diagramsTypes: Awaited<ReturnType<typeof fetchDiagramsTypes>>;
  onEdit: (diagram: Awaited<ReturnType<typeof fetchAllWorkDiagrams>>[number]) => void;
  onModeChange: (mode: 'create' | 'edit') => void;
  data: Awaited<ReturnType<typeof fetchAllWorkDiagrams>>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const [showActive, setShowActive] = useState(true);
  const [filteredData, setFilteredData] = useState<Awaited<ReturnType<typeof fetchAllWorkDiagrams>>>(
    data.filter((item) => Boolean(item.is_active) === showActive)
  );

  // Filtra automáticamente cada vez que showActive o data cambian
  useEffect(() => {
    const filtered = data?.filter((item) => Boolean(item.is_active) === showActive);
    setFilteredData(filtered);
  }, [data, showActive]);
  const names = createFilterOptions(filteredData, (document) => document.name);
  const activeNovelties = createFilterOptions(filteredData, (document) => document.active_novelty?.name);
  const inactiveNovelties = createFilterOptions(filteredData, (document) => document.inactive_novelty?.name);

  const handleEdit = (diagram: Awaited<ReturnType<typeof fetchAllWorkDiagrams>>[number]) => {
    onEdit(diagram);
    onModeChange('edit');
  };

  console.log(filteredData, 'filteredData');
  return (
    <div className="mx-auto ml-4">
      <div className="flex flex-col">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Diagramas de Trabajo</h2>
          <div className="flex justify-end">
            <Button variant="gh_orange" onClick={() => setShowActive((prev) => !prev)}>
              {showActive ? 'Ver inactivos' : 'Ver activos'}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto w-full">
          <BaseDataTable
            savedVisibility={savedVisibility}
            columns={getDiagramColumns(handleEdit)}
            data={filteredData}
            tableId="diagram-table-empresa"
            toolbarOptions={{
              initialVisibleFilters: savedFilter || [],
              filterableColumns: [
                {
                  columnId: 'Nombre',
                  title: 'Nombre',
                  options: names,
                },
                {
                  columnId: 'Novedad activa',
                  title: 'Novedad activa',
                  options: activeNovelties,
                },
                {
                  columnId: 'Novedad inactiva',
                  title: 'Novedad inactiva',
                  options: inactiveNovelties,
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}
