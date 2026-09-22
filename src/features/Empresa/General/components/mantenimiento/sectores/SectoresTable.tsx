'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { VerActivosButton } from '@/features/Empresa/RRHH/components/verActivosButton';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { use, useState } from 'react';
import type { WorkshopSector } from '../../../actions/workshops.server';
import { useSectoresStore } from './store/sectores.store';

export function getSectoresColumns(
  onEdit: (sector: WorkshopSector) => void,
  canEdit: boolean
): ColumnDef<WorkshopSector>[] {
  const columns: ColumnDef<WorkshopSector>[] = [
    {
      accessorKey: 'name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'description',
      id: 'Descripcion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripcion" />,
      cell: ({ row }) => <span>{row.original.description || '-'}</span>,
    },
    {
      accessorKey: 'workshops.name',
      id: 'Taller',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Taller" />,
      cell: ({ row }) => <span>{row.original.workshops?.name || '-'}</span>,
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'max_capacity',
      id: 'Cupo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cupo" />,
      cell: ({ row }) => <span>{row.original.max_capacity != null ? row.original.max_capacity : '-'}</span>,
    },
    {
      accessorKey: 'is_active',
      id: 'Estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  if (canEdit) {
    columns.push({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    });
  }

  return columns;
}

export function SectoresTable({
  workshopSectors,
  savedVisibility,
  savedFilter,
}: {
  workshopSectors: Promise<WorkshopSector[]>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const sectorsData = use(workshopSectors);
  const onEdit = useSectoresStore((state) => state.setSector);
  const [filteredData, setFilteredData] = useState<WorkshopSector[]>(sectorsData);
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('empresa', 'sectores_taller', 'update');

  const names = createFilterOptions(filteredData, (sector) => sector.name);

  const workshops = createFilterOptions(filteredData, (sector) => sector.workshops?.name || '').filter(
    (opt) => opt.value !== ''
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Sectores de Taller</h2>
        <VerActivosButton data={sectorsData} filterKey="is_active" onFilteredChange={setFilteredData} />
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
        <BaseDataTable
          savedVisibility={savedVisibility}
          columns={getSectoresColumns(onEdit, canEdit)}
          data={filteredData}
          tableId="sectores-table"
          toolbarOptions={{
            initialVisibleFilters: savedFilter || [],
            showFilterOptions: true,
            filterableColumns: [
              {
                columnId: 'Nombre',
                title: 'Nombre',
                options: names,
              },
              {
                columnId: 'Taller',
                title: 'Taller',
                options: workshops,
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

export default SectoresTable;
