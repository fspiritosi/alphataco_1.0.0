'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { filterByActiveFlag } from '@/shared/components/common/active-filter';
import { VerActivosButton } from '@/shared/components/common/VerActivosButton';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { use, useMemo, useState } from 'react';
import type { Workshop } from '../../../actions/workshops.server';
import { useTalleresStore } from './store/talleres.store';

export function getTalleresColumns(onEdit: (workshop: Workshop) => void, canEdit: boolean): ColumnDef<Workshop>[] {
  const columns: ColumnDef<Workshop>[] = [
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
      accessorKey: 'type',
      id: 'Tipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'interno' ? 'default' : 'secondary'} className="capitalize">
          {row.original.type}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'address',
      id: 'Direccion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Direccion" />,
      cell: ({ row }) => <span>{row.original.address || '-'}</span>,
    },
    {
      accessorKey: 'provinces.name',
      id: 'Provincia',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
      cell: ({ row }) => <span>{row.original.provinces?.name || '-'}</span>,
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'cities.name',
      id: 'Ciudad',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
      cell: ({ row }) => <span>{row.original.cities?.name || '-'}</span>,
    },
    {
      accessorKey: 'provider_name',
      id: 'Proveedor',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Proveedor" />,
      cell: ({ row }) => <span>{row.original.provider_name || '-'}</span>,
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

export function TalleresTable({
  workshops,
  savedVisibility,
  savedFilter,
}: {
  workshops: Promise<Workshop[]>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const workshopsData = use(workshops);
  const onEdit = useTalleresStore((state) => state.setWorkshop);
  // Sólo se guarda el toggle: la lista se DERIVA de `workshopsData` en cada render, así un alta
  // seguida de `router.refresh()` aparece en la tabla.
  const [showActive, setShowActive] = useState(true);
  const filteredData = useMemo(() => filterByActiveFlag(workshopsData, 'is_active', showActive), [workshopsData, showActive]);
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('empresa', 'talleres', 'update');

  const names = createFilterOptions(filteredData, (workshop) => workshop.name);

  const types = createFilterOptions(filteredData, (workshop) => workshop.type);

  const provinces = createFilterOptions(filteredData, (workshop) => workshop.provinces?.name || '').filter(
    (opt) => opt.value !== ''
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Talleres</h2>
        <VerActivosButton showActive={showActive} onToggle={setShowActive} />
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
        <BaseDataTable
          savedVisibility={savedVisibility}
          columns={getTalleresColumns(onEdit, canEdit)}
          data={filteredData}
          tableId="talleres-table"
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
                columnId: 'Tipo',
                title: 'Tipo',
                options: types,
              },
              {
                columnId: 'Provincia',
                title: 'Provincia',
                options: provinces,
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

export default TalleresTable;
