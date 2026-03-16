'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels } from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleOff } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  getAvailableVehicleSingleFacet,
  getAvailableVehiclesForExport,
  getAvailableVehiclesPaginated,
  type AvailableVehicleItem,
} from '../actions/actions.server';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — builders para FacetResult (reduce boilerplate)
// ─────────────────────────────────────────────────────────────────────────────

function buildFkFacetResult(
  resolvedOptions: Array<{ id: string; name: string | null }> | undefined,
  counts: Map<string, number>,
  nullLabel = 'Sin asignar'
): FacetResult {
  return {
    options: [
      ...(resolvedOptions?.map((o) => ({ value: o.id, label: o.name ?? '' })) ?? []),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: nullLabel, icon: CircleOff }] : []),
    ],
    counts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────────────────────────────────────

function getColumns(): ColumnDef<AvailableVehicleItem>[] {
  return [
    {
      id: 'domain',
      accessorKey: 'domain',
      meta: { title: 'Dominio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/equipment/action?action=view&id=${row.original.id}`}
          target="_blank"
          className="font-medium hover:underline text-primary"
        >
          {row.original.domain ?? '-'}
        </Link>
      ),
    },
    {
      id: 'serie',
      accessorKey: 'serie',
      meta: { title: 'Serie' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.serie ?? '-'}</span>,
    },
    {
      id: 'intern_number',
      accessorKey: 'intern_number',
      meta: { title: 'N° Interno' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Interno" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.intern_number ?? '-'}</span>,
    },
    {
      id: 'vehicleType',
      accessorFn: (row) => row.type_vehicles_typeTotype?.name ?? '',
      meta: { title: 'Tipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.type_vehicles_typeTotype?.name ?? '-'}</span>
      ),
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.type;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },
    {
      id: 'subType',
      accessorFn: (row) => row.sub_type?.name ?? '',
      meta: { title: 'Subtipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subtipo" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.sub_type?.name ?? '-'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.subType;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },
    {
      id: 'condition',
      accessorKey: 'condition',
      meta: { title: 'Condición' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => (
        <Badge variant="success" className="text-xs">
          {conditionLabels[row.original.condition ?? ''] ?? row.original.condition ?? '-'}
        </Badge>
      ),
    },
    {
      id: 'contractor_equipment',
      accessorFn: (row) =>
        row.contractor_equipment
          ?.map((c) => c.customers?.name)
          .filter(Boolean)
          .join(', ') ?? '',
      meta: { title: 'Afectaciones' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
      cell: ({ row }) => {
        const names =
          row.original.contractor_equipment?.map((c) => c.customers?.name).filter((n): n is string => !!n) ?? [];
        if (names.length === 0) {
          return <Badge variant="outline">Sin afectar</Badge>;
        }
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline">
                  {names[0]}
                  {names.length > 1 && ` +${names.length - 1}`}
                </Badge>
              </TooltipTrigger>
              {names.length > 1 && (
                <TooltipContent>
                  <div className="flex flex-col gap-1">
                    {names.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const items = row.original.contractor_equipment ?? [];
        if (items.length === 0) return value.includes(NULL_FILTER_VALUE);
        return items.some((c) => c.customers?.id && value.includes(c.customers.id));
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  typeIds?: string[];
}

export default function AvailableVehiclesDialog({ open, onOpenChange, count, typeIds }: Props) {
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>({});

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  // queryFn paginado — apunta directo a Prisma server-side
  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getAvailableVehiclesPaginated(params, typeIds),
    [typeIds]
  );

  const columns = useMemo(() => getColumns(), []);

  // Factory para facets FK con lazy-load
  const makeFkFetchFacet = useCallback(
    (columnId: string, nullLabel = 'Sin asignar') => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getAvailableVehicleSingleFacet(columnId, typeIds, params);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts, nullLabel);
      };
    },
    [typeIds]
  );

  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      { columnId: 'vehicleType', title: 'Tipo', fetchFacet: makeFkFetchFacet('vehicleType') },
      { columnId: 'subType', title: 'Subtipo', fetchFacet: makeFkFetchFacet('subType') },
      {
        columnId: 'contractor_equipment',
        title: 'Afectaciones',
        fetchFacet: makeFkFetchFacet('contractor_equipment', 'Sin afectar'),
      },
    ],
    [makeFkFetchFacet]
  );

  const exportConfig = useMemo(
    () => ({
      fetchAllData: () => getAvailableVehiclesForExport(currentParams, typeIds),
      options: {
        filename: 'vehiculos-disponibles-sin-asignar',
        sheetName: 'Disponible - Sin asignar',
        title: 'Disponible - Sin asignar',
      },
      formatters: {
        vehicleType: (_val: unknown, row: AvailableVehicleItem) => row.type_vehicles_typeTotype?.name ?? '-',
        subType: (_val: unknown, row: AvailableVehicleItem) => row.sub_type?.name ?? '-',
        condition: (val: unknown) => conditionLabels[String(val ?? '')] ?? String(val ?? '-'),
        contractor_equipment: (_val: unknown, row: AvailableVehicleItem) => {
          const names = row.contractor_equipment?.map((c) => c.customers?.name).filter((n): n is string => !!n) ?? [];
          return names.length > 0 ? names.join(', ') : 'Sin afectar';
        },
      },
    }),
    [currentParams, typeIds]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Disponible / Sin asignar ({count})</DialogTitle>
          <DialogDescription>Vehiculos operativos que no estan en el parte diario de hoy.</DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <DataTable
            columns={columns}
            data={[]}
            totalRows={0}
            queryFn={tableQueryFn}
            queryKey={['dashboard-available-vehicles', ...(typeIds ?? [])]}
            onStateChange={handleStateChange}
            facetedFilters={facetedFilters}
            exportConfig={exportConfig}
            searchPlaceholder="Buscar por dominio, serie, N° interno..."
            showSearch
            showFilterToggle
            showColumnToggle
            emptyMessage="No hay vehiculos disponibles"
            paramNamespace="veh-avail-dialog"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
