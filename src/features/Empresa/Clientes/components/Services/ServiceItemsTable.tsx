'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import type { MeasureUnitRow } from '../../actions/measure-units.server';
import { getServiceItemsByContract, type ServiceItemRow } from '../../actions/service-items.server';
import { PriceRevisionsDialog } from './PriceRevisionsDialog';
import ServiceItemsForm from './ServiceItemsForm';

interface ServiceItemsTableProps {
  measureUnits: MeasureUnitRow[];
  customerServiceId: string;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

interface PricePermissions {
  canViewPrices: boolean;
  canUpdatePrices: boolean;
}

function getServiceItemsColumns(
  handleEdit: (item: ServiceItemRow) => void,
  hasUpdatePermission: boolean,
  pricePermissions: PricePermissions,
  onPriceSaved: () => void
): ColumnDef<ServiceItemRow>[] {
  const columns: ColumnDef<ServiceItemRow>[] = [
    {
      accessorKey: 'item_name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      id: 'Estado',
      accessorFn: (row) => (row.is_active ? 'Activo' : 'Inactivo'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return <Badge variant={isActive ? 'success' : 'destructive'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>;
      },
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      accessorKey: 'needs_personnel',
      id: 'needs_personnel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Req. Personal" />,
      cell: ({ row }) => {
        const needsPersonnel = row.original.needs_personnel;
        return <Badge variant={needsPersonnel ? 'success' : 'destructive'}>{needsPersonnel ? 'Sí' : 'No'}</Badge>;
      },
    },
    {
      accessorKey: 'needs_equipment',
      id: 'needs_equipment',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Req. Equipos" />,
      cell: ({ row }) => {
        const needsEquipment = row.original.needs_equipment;
        return <Badge variant={needsEquipment ? 'success' : 'destructive'}>{needsEquipment ? 'Sí' : 'No'}</Badge>;
      },
    },
    {
      accessorKey: 'item_description',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      accessorKey: 'code_item',
      id: 'Codigo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Codigo" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      accessorKey: 'item_number',
      id: 'Numero',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Numero" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      id: 'UDM',
      accessorFn: (row) => row.measure_units.unit,
      header: ({ column }) => <DataTableColumnHeader column={column} title="UDM" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
  ];

  // `view_prices` esta separado de `view` a proposito: hay roles que administran items de
  // contrato sin ver los importes.
  if (pricePermissions.canViewPrices) {
    columns.push({
      accessorKey: 'item_price',
      id: 'Precio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="tabular-nums">${row.original.item_price}</span>
          <PriceRevisionsDialog
            serviceItemId={row.original.id}
            itemName={row.original.item_name}
            currentPrice={row.original.item_price}
            canUpdatePrices={pricePermissions.canUpdatePrices}
            onSaved={onPriceSaved}
          />
        </div>
      ),
    });
  }

  if (hasUpdatePermission) {
    columns.push({
      id: 'Acciones',
      enableHiding: false,
      enableColumnFilter: false,
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

/** Items de un contrato: tabla (activos/inactivos) + formulario lateral de alta/edición. */
export default function ServiceItemsTable({
  measureUnits,
  customerServiceId,
  savedFilters,
  savedVisibility,
}: ServiceItemsTableProps) {
  const [editingItem, setEditingItem] = useState<ServiceItemRow | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['service-items', customerServiceId] as const;

  const { data: items = [] } = useQuery({
    queryKey,
    queryFn: () => getServiceItemsByContract(customerServiceId),
    enabled: !!customerServiceId,
    staleTime: 60 * 1000,
  });

  const { hasPermission } = usePermissions();
  const hasUpdatePermission = hasPermission('comercial', 'items-contrato', 'update');
  const canViewPrices = hasPermission('comercial', 'items-contrato', 'view_prices');
  const canUpdatePrices = hasPermission('comercial', 'items-contrato', 'update_prices');
  const canCreateOrUpdate = hasPermission('comercial', 'items-contrato', 'create') || hasUpdatePermission;

  const filteredItems = useMemo(
    () => items.filter((item) => (showInactive ? item.is_active === false : item.is_active !== false)),
    [items, showInactive]
  );

  const filterOptions = useMemo(
    () => ({
      names: createFilterOptions(filteredItems, (item) => item.item_name),
      states: createFilterOptions(filteredItems, (item) => (item.is_active ? 'Activo' : 'Inactivo')),
      codes: createFilterOptions(filteredItems, (item) => item.code_item),
      numbers: createFilterOptions(filteredItems, (item) => item.item_number),
      udm: createFilterOptions(filteredItems, (item) => item.measure_units.unit),
    }),
    [filteredItems]
  );

  const refreshItems = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['service-items', customerServiceId] });
    queryClient.invalidateQueries({ queryKey: ['preparte-service-items', customerServiceId] });
  }, [queryClient, customerServiceId]);

  const columns = useMemo(
    () =>
      getServiceItemsColumns(setEditingItem, hasUpdatePermission, { canViewPrices, canUpdatePrices }, refreshItems),
    [hasUpdatePermission, canViewPrices, canUpdatePrices, refreshItems]
  );

  const handleSaved = () => {
    setEditingItem(null);
    refreshItems();
  };

  return (
    <ResizablePanelGroup className="flex flex-col gap-2" direction="horizontal">
      {canCreateOrUpdate && (
        <>
          <ResizablePanel defaultSize={30}>
            <Card>
              <ServiceItemsForm
                key={editingItem?.id ?? 'new'}
                measureUnits={measureUnits}
                customerServiceId={customerServiceId}
                editingItem={editingItem}
                onCancel={() => setEditingItem(null)}
                onSaved={handleSaved}
              />
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel className="min-w-[500px] flex flex-col gap-2" defaultSize={canCreateOrUpdate ? 70 : 100}>
        <Card>
          <div className="flex flex-col p-4">
            <div className="flex space-x-4 justify-end mb-2">
              <Button variant="brand" onClick={() => setShowInactive((prev) => !prev)}>
                {showInactive ? 'Ver Activos' : 'Ver Inactivos'}
              </Button>
            </div>
            <BaseDataTable
              columns={columns}
              data={filteredItems}
              savedVisibility={savedVisibility}
              tableId="service-items-table"
              toolbarOptions={{
                initialVisibleFilters: savedFilters,
                filterableColumns: [
                  { columnId: 'Nombre', title: 'Nombre', options: filterOptions.names },
                  { columnId: 'Estado', title: 'Estado', options: filterOptions.states },
                  { columnId: 'Codigo', title: 'Codigo', options: filterOptions.codes },
                  { columnId: 'Numero', title: 'Numero', options: filterOptions.numbers },
                  { columnId: 'UDM', title: 'UDM', options: filterOptions.udm },
                ],
              }}
            />
          </div>
        </Card>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
