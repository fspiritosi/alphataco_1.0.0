'use client';

import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useMemo } from 'react';
import type { SectorRow } from '../../actions/sectors.server';
import { SectorFormDialog } from './SectorFormDialog';

interface SectorTableProps {
  contractorSectors: SectorRow[];
  /** Cliente de la ficha: se le pasa al diálogo de edición para no volver a preguntarlo. */
  customerId: string;
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

export function getSectorColumns(customerId: string, canEdit: boolean): ColumnDef<SectorRow>[] {
  const columns: ColumnDef<SectorRow>[] = [
    {
      id: 'Nombre',
      accessorFn: (row) => row.sectors.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
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
        <SectorFormDialog customerId={customerId} sector={row.original} triggerLabel="Editar" triggerVariant="link" />
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

function SectorTable({ contractorSectors, customerId }: SectorTableProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'sectores-cliente', 'update');

  const savedVisibility = readCookieJson<VisibilityState>('comercial-sector-table', {});
  const savedFilters = readCookieJson<string[]>('comercial-sector-table-filters', []);

  const columns = useMemo(() => getSectorColumns(customerId, canEdit), [customerId, canEdit]);

  const filterOptions = useMemo(
    () => ({ names: createFilterOptions(contractorSectors, (sector) => sector.sectors.name) }),
    [contractorSectors]
  );

  return (
    <div className="p-4 pt-0">
      <BaseDataTable
        columns={columns}
        data={contractorSectors}
        savedVisibility={savedVisibility}
        tableId="comercial-sector-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          filterableColumns: [
            { columnId: 'Nombre', title: 'Nombre', options: filterOptions.names },
          ],
        }}
      />
    </div>
  );
}

export default SectorTable;
