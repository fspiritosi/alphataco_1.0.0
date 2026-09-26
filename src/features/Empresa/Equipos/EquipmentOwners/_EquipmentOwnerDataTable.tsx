'use client';

import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { DataTable } from '@/shared/components/common/DataTable';
import moment from 'moment';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { EquipmentOwnerForm } from './EquipmentOwnerForm';
import { VehiclesByOwnerList } from './VehiclesByOwnerList';
import type { EquipmentOwnerListItem } from './actions.server';
import {
  getAllEquipmentOwnersForExport,
  getEquipmentOwnerSingleFacet,
  getEquipmentOwnersPaginated,
} from './actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getEquipmentOwnerColumns } from './columns';
import { VehiclesByOwnerTableSkeleton } from './fallback/EquipmentOwnerTableSkeleton';

// ============================================================================
// PROPS
// ============================================================================

interface EquipmentOwnerDataTableProps {
  data: EquipmentOwnerListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  permissionsMap: Record<string, boolean>;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTERS = ['is_active', 'name'];

// ============================================================================
// CLIENT COMPONENT — orquesta tabla principal + form + vista equipos del titular
// ============================================================================

export function _EquipmentOwnerDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: EquipmentOwnerDataTableProps) {
  // ── Permisos ──────────────────────────────────────────────────────────────
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  const canCreateOrUpdate =
    permissions.hasPermission('configuracion', 'titulares', 'create') ||
    permissions.hasPermission('configuracion', 'titulares', 'update');

  // ── Estado local para edición y vista de equipos ──────────────────────────
  const [editingOwner, setEditingOwner] = useState<EquipmentOwnerListItem | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; name: string } | null>(null);

  const handleEdit = useCallback((item: EquipmentOwnerListItem) => {
    setEditingOwner(item);
    setSelectedOwner(null);
  }, []);

  const handleViewEquipment = useCallback((item: EquipmentOwnerListItem) => {
    setSelectedOwner({ id: item.id, name: item.name });
    setEditingOwner(null);
  }, []);

  const handleFormReset = useCallback(() => {
    setEditingOwner(null);
  }, []);

  const handleCloseSecondaryTable = useCallback(() => {
    setSelectedOwner(null);
  }, []);

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => getEquipmentOwnerColumns(permissions, handleEdit, handleViewEquipment),
    [permissions, handleEdit, handleViewEquipment]
  );

  // ── Client-side navigation ────────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);
  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback((params: DataTableSearchParams) => getEquipmentOwnersPaginated(params), []);

  // ── Lazy-load facets ──────────────────────────────────────────────────────
  const makeFetchFacet = useCallback(
    (columnId: string) => async (params: DataTableSearchParams) => {
      const result = await getEquipmentOwnerSingleFacet(columnId, params);
      return result ?? { options: [], counts: new Map<string, number>() };
    },
    []
  );

  const facetedFilters = useMemo(
    () => [
      { columnId: 'is_active', title: 'Estado', fetchFacet: makeFetchFacet('is_active') },
      { columnId: 'name', title: 'Nombre', type: 'text' as const },
      { columnId: 'cuit', title: 'CUIT', type: 'text' as const },
      { columnId: 'created_at', title: 'Fecha de creación', type: 'dateRange' as const },
    ],
    [makeFetchFacet]
  );

  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  const mergedColumnVisibility = useMemo(
    () => ({
      ...Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
      ...initialColumnVisibility,
    }),
    [initialColumnVisibility]
  );

  // ── Vista de equipos del titular seleccionado ─────────────────────────────
  if (selectedOwner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Equipos de: {selectedOwner.name}</h3>
            <p className="text-sm text-muted-foreground">Listado de equipos registrados para este titular</p>
          </div>
          <Button variant="outline" onClick={handleCloseSecondaryTable}>
            Volver a Titulares
          </Button>
        </div>
        <Suspense fallback={<VehiclesByOwnerTableSkeleton />}>
          <VehiclesByOwnerList ownerId={selectedOwner.id} ownerName={selectedOwner.name} searchParams={searchParams} />
        </Suspense>
      </div>
    );
  }

  // ── Tabla principal ───────────────────────────────────────────────────────
  const table = (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['equipment-owners-list']}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      searchPlaceholder="Buscar por nombre o CUIT..."
      emptyMessage="No hay titulares de equipos registrados"
      showFilterToggle={true}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      exportConfig={{
        fetchAllData: () => getAllEquipmentOwnersForExport(currentParams),
        options: {
          filename: 'titulares-de-equipos',
          sheetName: 'Titulares de Equipos',
          title: 'Titulares de Equipos',
        },
        formatters: {
          equipment_owner_contract_types: (val: unknown) => {
            if (!Array.isArray(val)) return '';
            return (val as Array<{ contract_type: string }>).map((ct) => ct.contract_type).join(', ');
          },
          is_active: (val: unknown) => (val === true ? 'Activo' : val === false ? 'Inactivo' : 'Sin asignar'),
          created_at: (val: unknown) => (val ? moment(val as string | Date).format('DD/MM/YYYY') : '-'),
        },
      }}
    />
  );

  if (!canCreateOrUpdate) {
    return table;
  }

  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[500px]" direction="horizontal">
        <ResizablePanel defaultSize={30}>
          <div className="overflow-auto h-full pr-2">
            <EquipmentOwnerForm
              key={editingOwner?.id ?? 'create'}
              initialData={editingOwner}
              onReset={handleFormReset}
              isEditing={!!editingOwner}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <div className="overflow-auto h-full pl-2">{table}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
