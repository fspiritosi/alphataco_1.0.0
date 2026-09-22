'use client';

import { Button } from '@/components/ui/button';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useMemo } from 'react';
import type { CustomerEquipmentRow } from '../../actions/customer-equipment.server';

interface CustomerEquipmentTableProps {
  customerEquipments: CustomerEquipmentRow[];
  setSelectedCustomerEquipment: (customerEquipment: CustomerEquipmentRow | null) => void;
  setMode: (mode: 'create' | 'edit') => void;
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

export function getCustomerEquipmentColumns(
  handleEdit: (equipment: CustomerEquipmentRow) => void,
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
      id: 'Cliente',
      accessorFn: (row) => row.customers.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
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

function CustomerEquipmentTable({ customerEquipments, setSelectedCustomerEquipment, setMode }: CustomerEquipmentTableProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'equipment', 'update');

  const savedVisibility = readCookieJson<VisibilityState>('comercial-equipment-table', {});
  const savedFilters = readCookieJson<string[]>('comercial-equipment-table-filters', []);

  const columns = useMemo(
    () =>
      getCustomerEquipmentColumns((equipment) => {
        setSelectedCustomerEquipment(equipment);
        setMode('edit');
      }, canEdit),
    [canEdit, setSelectedCustomerEquipment, setMode]
  );

  const filterOptions = useMemo(
    () => ({
      names: createFilterOptions(customerEquipments, (equipment) => equipment.name),
      clients: createFilterOptions(customerEquipments, (equipment) => equipment.customers.name),
      types: createFilterOptions(customerEquipments, (equipment) => equipment.type),
    }),
    [customerEquipments]
  );

  return (
    <div className="p-4 pt-0">
      <h2 className="text-xl font-bold mb-4">Equipos del cliente</h2>
      <BaseDataTable
        columns={columns}
        data={customerEquipments}
        savedVisibility={savedVisibility}
        tableId="comercial-equipment-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          filterableColumns: [
            { columnId: 'Nombre', title: 'Nombre', options: filterOptions.names },
            { columnId: 'Cliente', title: 'Cliente', options: filterOptions.clients },
            { columnId: 'Tipo de equipo', title: 'Tipo de equipo', options: filterOptions.types },
          ],
        }}
      />
    </div>
  );
}

export default CustomerEquipmentTable;
