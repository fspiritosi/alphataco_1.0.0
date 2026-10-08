'use client';

import {
  DataTable,
  type DataTableExportConfig,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { destinationTypeIcons } from '@/features/Warehouses/Movements/components/MovementsList/columns';
import { DESTINATION_TYPE_LABELS } from '@/features/Warehouses/lib/labels';
import { STOCK_DESTINATION_TYPES } from '@/features/Warehouses/schemas/stock-movement';
import { CircleOff, User } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_REQUEST_STATUSES,
  type PurchaseRequestStatus,
} from '../../../lib/request-state-machine';
import { purchaseRequestStatusIcons } from '../../components/PurchaseRequestStatusBadge';
import {
  getAllPurchaseRequestsForExport,
  getPurchaseRequestSingleFacet,
  getPurchaseRequestsPaginated,
  type PurchaseRequestListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from '../columns';

interface Props {
  data: PurchaseRequestListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

const DEFAULT_VISIBLE_FILTERS = ['status', 'destination_type', 'created_at'];

const EMPTY_FACET: FacetResult = { options: [], counts: new Map() };

export function _RequestsDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);
  const handleStateChange = useCallback((params: DataTableSearchParams) => setCurrentParams(params), []);
  const tableQueryFn = useCallback((params: DataTableSearchParams) => getPurchaseRequestsPaginated(params), []);

  const columns = useMemo(() => getColumns(), []);

  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((c) => [c, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Estado',
        fetchFacet: async (params: DataTableSearchParams): Promise<FacetResult> => {
          const result = await getPurchaseRequestSingleFacet('status', params);
          if (!result) return EMPTY_FACET;
          return {
            options: PURCHASE_REQUEST_STATUSES.map((value) => ({
              value,
              label: PURCHASE_REQUEST_STATUS_LABELS[value],
              icon: purchaseRequestStatusIcons[value],
            })),
            counts: result.counts,
          };
        },
      },
      {
        columnId: 'destination_type',
        title: 'Tipo de destino',
        fetchFacet: async (params: DataTableSearchParams): Promise<FacetResult> => {
          const result = await getPurchaseRequestSingleFacet('destination_type', params);
          if (!result) return EMPTY_FACET;
          return {
            options: [
              ...STOCK_DESTINATION_TYPES.map((value) => ({
                value,
                label: DESTINATION_TYPE_LABELS[value],
                icon: destinationTypeIcons[value],
              })),
              // El valor null del filtro es "sin destino": la solicitud repone stock.
              ...(result.counts.has(NULL_FILTER_VALUE)
                ? [{ value: NULL_FILTER_VALUE, label: 'Para stock', icon: CircleOff }]
                : []),
            ],
            counts: result.counts,
          };
        },
      },
      { columnId: 'created_at', title: 'Fecha', type: 'dateRange' as const },
      { columnId: 'needed_by', title: 'Se necesita para', type: 'dateRange' as const },
      {
        columnId: 'requester',
        title: 'Solicitante',
        fetchFacet: async (params: DataTableSearchParams): Promise<FacetResult> => {
          const result = await getPurchaseRequestSingleFacet('requester', params);
          if (!result) return EMPTY_FACET;
          return {
            options: (result.resolvedOptions ?? []).map((o) => ({ value: o.id, label: o.name ?? '', icon: User })),
            counts: result.counts,
          };
        },
      },
      { columnId: 'number', title: 'Número', type: 'text' as const, placeholder: 'Buscar por número...' },
      {
        columnId: 'destination',
        title: 'Destino',
        type: 'text' as const,
        placeholder: 'Legajo, apellido, dominio, interno, orden o cliente...',
      },
      {
        columnId: 'material_request',
        title: 'Pedido de origen',
        type: 'text' as const,
        placeholder: 'Número del pedido de materiales...',
      },
    ],
    []
  );

  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) return initialFilterVisibility;
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  const exportConfig: DataTableExportConfig<PurchaseRequestListItem> = useMemo(
    () => ({
      fetchAllData: () => getAllPurchaseRequestsForExport(currentParams),
      options: { filename: 'solicitudes-de-compra', title: 'Solicitudes de compra', sheetName: 'Solicitudes' },
      formatters: {
        status: (value) => PURCHASE_REQUEST_STATUS_LABELS[value as PurchaseRequestStatus] ?? String(value),
        created_at: (value) => (value ? moment(value as string | Date).format('DD/MM/YYYY') : ''),
        needed_by: (value) => (value ? moment.utc(value as string | Date).format('DD/MM/YYYY') : ''),
      },
    }),
    [currentParams]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      queryFn={tableQueryFn}
      queryKey={['purchase-requests']}
      onStateChange={handleStateChange}
      searchPlaceholder="Buscar por número o notas"
      emptyMessage="No hay solicitudes de compra"
      exportConfig={exportConfig}
      data-testid="purchase-requests-table"
    />
  );
}
