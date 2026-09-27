'use client';

import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useMemo } from 'react';
import type { CustomerEquipmentRow } from '../../actions/customer-equipment.server';
import { CustomerEquipmentFormDialog } from './CustomerEquipmentFormDialog';

interface CustomerEquipmentTableProps {
  customerEquipments: CustomerEquipmentRow[];
  /** Cliente de la ficha: se le pasa al diálogo de edición para no volver a preguntarlo. */
  customerId: string;
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

export function getCustomerEquipmentColumns(
  customerId: string,
  canEdit: boolean
): ColumnDef<CustomerEquipmentRow>[] {
  const columns: ColumnDef<CustomerEquipmentRow>[] = [
    {
      accessorKey: 'name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      accessorKey: 'type',
      id: 'Tipo de equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de equipo" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
  ];

  if (canEdit) {
    columns.push({
      id: 'Acciones',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => (
        <CustomerEquipmentFormDialog
          customerId={customerId}
          equipment={row.original}
          triggerLabel="Editar"
          triggerVariant="link"
        />
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

function CustomerEquipmentTable({ customerEquipments, customerId }: CustomerEquipmentTableProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'equipos-cliente', 'update');

  const savedVisibility = readCookieJson<VisibilityState>('comercial-equipment-table', {});
  const savedFilters = readCookieJson<string[]>('comercial-equipment-table-filters', []);

  const columns = useMemo(() => getCustomerEquipmentColumns(customerId, canEdit), [customerId, canEdit]);

  const filterOptions = useMemo(
    () => ({
      names: createFilterOptions(customerEquipments, (equipment) => equipment.name),
      types: createFilterOptions(customerEquipments, (equipment) => equipment.type),
    }),
    [customerEquipments]
  );

  return (
    <div className="p-4 pt-0">
      <BaseDataTable
        columns={columns}
        data={customerEquipments}
        savedVisibility={savedVisibility}
        tableId="comercial-equipment-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          filterableColumns: [
            { columnId: 'Nombre', title: 'Nombre', options: filterOptions.names },
            { columnId: 'Tipo de equipo', title: 'Tipo de equipo', options: filterOptions.types },
          ],
        }}
      />
    </div>
  );
}

export default CustomerEquipmentTable;
