'use client';

import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useMemo } from 'react';
import type { SectorCustomerRow } from '../../actions/sectors.server';

interface SectorTableProps {
  contractorSectors: SectorCustomerRow[];
  setSelectedSector: (sector: SectorCustomerRow | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

export function getSectorColumns(
  handleEdit: (sector: SectorCustomerRow) => void,
  canEdit: boolean
): ColumnDef<SectorCustomerRow>[] {
  const columns: ColumnDef<SectorCustomerRow>[] = [
    {
      id: 'Nombre',
      accessorFn: (row) => row.sectors.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      id: 'Cliente',
      accessorFn: (row) => row.customers.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      id: 'Descripción',
      accessorFn: (row) => row.sectors.descripcion_corta ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
  ];

  if (canEdit) {
    columns.push({
      id: 'Acciones',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => handleEdit(row.original)}>
          Editar
        </Button>
      ),
    });
  }

  return columns;
}

function readCookieJson<T>(name: string, fallback: T): T {
  const raw = Cookies.get(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function SectorTable({ contractorSectors, setSelectedSector, setMode }: SectorTableProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'sector', 'update');

  const savedVisibility = readCookieJson<VisibilityState>('comercial-sector-table', {});
  const savedFilters = readCookieJson<string[]>('comercial-sector-table-filters', []);

  const columns = useMemo(
    () =>
      getSectorColumns((sector) => {
        setSelectedSector(sector);
        setMode('edit');
      }, canEdit),
    [canEdit, setSelectedSector, setMode]
  );

  const filterOptions = useMemo(
    () => ({
      names: createFilterOptions(contractorSectors, (sector) => sector.sectors.name),
      clients: createFilterOptions(contractorSectors, (sector) => sector.customers.name),
    }),
    [contractorSectors]
  );

  return (
    <div className="p-4 pt-0">
      <h2 className="text-xl font-bold mb-4">Sectores </h2>
      <BaseDataTable
        columns={columns}
        data={contractorSectors}
        savedVisibility={savedVisibility}
        tableId="comercial-sector-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          filterableColumns: [
            { columnId: 'Nombre', title: 'Nombre', options: filterOptions.names },
            { columnId: 'Cliente', title: 'Cliente', options: filterOptions.clients },
          ],
        }}
      />
    </div>
  );
}

export default SectorTable;
