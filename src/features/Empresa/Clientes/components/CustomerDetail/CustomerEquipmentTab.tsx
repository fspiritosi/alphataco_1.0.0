'use client';

import { Badge } from '@/components/ui/badge';
import type { AssignmentChanges } from '../../lib/assignment-diff';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { PermissionGuard } from '@/features/Permissions';
import { fetchAllEquipment } from '@/shared/actions/equipment.actions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { conditionLabels, employeeStatusBadges, employeeStatusLabels } from '@/shared/utils/mappers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  getCustomerEquipmentAssignments,
  updateCustomerEquipmentAssignments,
} from '../../actions/assignments.server';
import type { CustomerRow } from '../../lib/serializers';
import { AssignmentDialog } from './AssignmentDialog';

type EquipmentRow = Awaited<ReturnType<typeof fetchAllEquipment>>[number];

interface CustomerEquipmentTabProps {
  customer: CustomerRow;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

const equipmentColumns: ColumnDef<EquipmentRow>[] = [
  {
    accessorKey: 'intern_number',
    id: 'Número interno',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Número interno" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    accessorKey: 'domain',
    id: 'Dominio',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    id: 'Tipo',
    accessorFn: (row) => row.type?.name ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    id: 'Marca',
    accessorFn: (row) => row.brand?.name ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    id: 'Modelo',
    accessorFn: (row) => row.model?.name ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    accessorKey: 'year',
    id: 'Año',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    id: 'Condición',
    accessorFn: (row) => (row.condition ? (conditionLabels[row.condition] ?? row.condition) : ''),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
  {
    id: 'Estado',
    accessorFn: (row) => (row.status ? (employeeStatusLabels[row.status] ?? row.status) : ''),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.original.status;
      if (!status) return '-';
      return <Badge variant={employeeStatusBadges[status] ?? 'default'}>{employeeStatusLabels[status] ?? status}</Badge>;
    },
    filterFn: (row, id, value) => includesValue(row.getValue(id), value),
  },
];

/** Pestaña "Equipos": los afectados al cliente (tabla) y el modal de altas/bajas. */
export function CustomerEquipmentTab({ customer, savedVisibility, savedFilters }: CustomerEquipmentTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ['customer-equipment', customer.id] as const;

  const { data: equipment = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchAllEquipment(),
    staleTime: 60 * 1000,
  });

  const assignedEquipment = useMemo(
    () =>
      equipment.filter((vehicle) =>
        vehicle.contractor_equipment.some((assignment) => assignment.contractor_id?.id === customer.id)
      ),
    [equipment, customer.id]
  );

  const options = useMemo(
    () =>
      equipment.map((vehicle) => ({
        value: vehicle.id,
        label: [vehicle.intern_number, vehicle.domain].filter(Boolean).join(' - ') || vehicle.id,
      })),
    [equipment]
  );

  const filterOptions = useMemo(
    () => ({
      internNumber: createFilterOptions(assignedEquipment, (vehicle) => vehicle.intern_number),
      domain: createFilterOptions(assignedEquipment, (vehicle) => vehicle.domain),
      type: createFilterOptions(assignedEquipment, (vehicle) => vehicle.type?.name),
      brand: createFilterOptions(assignedEquipment, (vehicle) => vehicle.brand?.name),
      condition: createFilterOptions(assignedEquipment, (vehicle) =>
        vehicle.condition ? (conditionLabels[vehicle.condition] ?? vehicle.condition) : null
      ),
      status: createFilterOptions(assignedEquipment, (vehicle) =>
        vehicle.status ? (employeeStatusLabels[vehicle.status] ?? vehicle.status) : null
      ),
    }),
    [assignedEquipment]
  );

  const saveAssignments = (changes: AssignmentChanges) => updateCustomerEquipmentAssignments(customer.id, changes);

  return (
    <div className="p-6 rounded-lg border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Equipos del Cliente</h3>
        <PermissionGuard module="comercial" tab="equipos-cliente" action="update">
          <AssignmentDialog
            triggerLabel="Asignar Equipos"
            title="Seleccionar Equipos"
            description={`Asigná los equipos que trabajan para ${customer.name}.`}
            fieldLabel="Equipos"
            placeholder="Buscar equipos..."
            emptyMessage="No se encontraron equipos"
            options={options}
            nouns={{ singular: 'equipo', plural: 'equipos' }}
            loadBaseline={() => getCustomerEquipmentAssignments(customer.id)}
            save={saveAssignments}
            onSaved={() => queryClient.invalidateQueries({ queryKey })}
          />
        </PermissionGuard>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <BaseDataTable
          columns={equipmentColumns}
          data={assignedEquipment}
          tableId="equipment-table-equipment"
          savedVisibility={savedVisibility}
          toolbarOptions={{
            initialVisibleFilters: savedFilters,
            filterableColumns: [
              { columnId: 'Número interno', title: 'Número interno', options: filterOptions.internNumber },
              { columnId: 'Dominio', title: 'Dominio', options: filterOptions.domain },
              { columnId: 'Tipo', title: 'Tipo', options: filterOptions.type },
              { columnId: 'Marca', title: 'Marca', options: filterOptions.brand },
              { columnId: 'Condición', title: 'Condición', options: filterOptions.condition },
              { columnId: 'Estado', title: 'Estado', options: filterOptions.status },
            ],
          }}
        />
      )}
    </div>
  );
}
