'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { daily_report_status, daily_report_type_enum } from '@/generated/prisma/enums';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { dailyReportRowStatusLabels, dailyReportTypeLabels } from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, CircleOff, Clock, FileX, RefreshCw, XCircle } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import {
  getAllServicesDetailForExport,
  getServicesDetailPaginated,
  getServicesDetailSingleFacet,
  type ServicesDetailListItem,
} from '../actions/actions.server';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'dashboard-services-detail';

const statusIcons: Record<string, LucideIcon> = {
  pendiente: Clock,
  sin_recursos_asignados: FileX,
  ejecutado: CheckCircle2,
  reprogramado: RefreshCw,
  cancelado: XCircle,
  en_certificacion: AlertCircle,
};

const typeServiceIcons: Record<string, LucideIcon> = {
  mensual: Clock,
  adicional: RefreshCw,
  adicional_permanente: CheckCircle2,
};

// ============================================================================
// HELPERS — builders para reducir boilerplate en fetchFacet
// ============================================================================

function buildEnumFacetResult(
  enumValues: string[],
  labels: Record<string, string>,
  icons: Record<string, LucideIcon>,
  counts: Map<string, number>
): FacetResult {
  return {
    options: [
      ...enumValues.map((value) => ({
        value,
        label: labels[value] ?? value,
        icon: icons[value],
      })),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }] : []),
    ],
    counts,
  };
}

function buildFkFacetResult(
  resolvedOptions: Array<{ id: string; name: string | null }> | undefined,
  counts: Map<string, number>
): FacetResult {
  return {
    options: [
      ...(resolvedOptions?.map((o) => ({ value: o.id, label: o.name ?? '' })) ?? []),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }] : []),
    ],
    counts,
  };
}

// ============================================================================
// COLUMNS
// ============================================================================

function getColumns(): ColumnDef<ServicesDetailListItem>[] {
  return [
    {
      id: 'customer',
      accessorFn: (row) => row.customers?.name ?? '',
      meta: { title: 'Cliente' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium">{row.original.customers?.name ?? '-'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.customers?.id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },
    {
      id: 'type_service',
      accessorKey: 'type_service',
      meta: { title: 'Tipo de Servicio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Servicio" />,
      cell: ({ row }) => {
        const val = row.original.type_service;
        if (!val) return <span className="text-muted-foreground">-</span>;
        const Icon = typeServiceIcons[val];
        const label = dailyReportTypeLabels[val] ?? val;
        return (
          <Badge variant="outline" className="gap-1">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const val = row.original.status;
        const Icon = statusIcons[val];
        const label = dailyReportRowStatusLabels[val] ?? val;
        const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'yellow'> = {
          pendiente: 'default',
          sin_recursos_asignados: 'yellow',
          ejecutado: 'success',
          reprogramado: 'secondary',
          cancelado: 'destructive',
          en_certificacion: 'outline',
        };
        return (
          <Badge variant={variantMap[val] ?? 'default'} className="gap-1">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },
    {
      id: 'description',
      accessorKey: 'description',
      meta: { title: 'Descripción' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.description ?? '-'}
        </span>
      ),
    },
    {
      id: 'remit_number',
      accessorKey: 'remit_number',
      meta: { title: 'N° Remito' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Remito" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.remit_number ?? '-'}</span>,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => {
        const val = row.original.created_at;
        return <span className="tabular-nums">{val ? moment(val).format('DD/MM/YYYY HH:mm') : '-'}</span>;
      },
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ServicesDetailDialog({ open, onOpenChange }: Props) {
  const [dateStr, setDateStr] = useState(moment().format('YYYY-MM-DD'));
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>({});

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  // queryFn para fetch client-side — activa client-side navigation mode
  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getServicesDetailPaginated(params, dateStr),
    [dateStr]
  );

  const columns = useMemo(() => getColumns(), []);

  // ─── fetchFacet factories ────────────────────────────────────────────────

  const makeEnumFetchFacet = useCallback(
    (columnId: string, enumValues: string[], labels: Record<string, string>, icons: Record<string, LucideIcon>) => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getServicesDetailSingleFacet(columnId, dateStr, params);
        if (!result) return { options: [], counts: new Map() };
        return buildEnumFacetResult(enumValues, labels, icons, result.counts);
      };
    },
    [dateStr]
  );

  const makeFkFetchFacet = useCallback(
    (columnId: string) => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getServicesDetailSingleFacet(columnId, dateStr, params);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts);
      };
    },
    [dateStr]
  );

  // ─── Filtros facetados con lazy-load ─────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Estado',
        fetchFacet: makeEnumFetchFacet(
          'status',
          Object.values(daily_report_status),
          dailyReportRowStatusLabels,
          statusIcons
        ),
      },
      {
        columnId: 'type_service',
        title: 'Tipo de Servicio',
        fetchFacet: makeEnumFetchFacet(
          'type_service',
          Object.values(daily_report_type_enum),
          dailyReportTypeLabels,
          typeServiceIcons
        ),
      },
      {
        columnId: 'customer',
        title: 'Cliente',
        fetchFacet: makeFkFetchFacet('customer'),
      },
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
      },
      {
        columnId: 'remit_number',
        title: 'N° Remito',
        type: 'text' as const,
      },
      {
        columnId: 'created_at',
        title: 'Fecha',
        type: 'dateRange' as const,
      },
    ],
    [makeEnumFetchFacet, makeFkFetchFacet]
  );

  const exportConfig = useMemo(
    () => ({
      fetchAllData: () => getAllServicesDetailForExport(currentParams, dateStr),
      options: {
        filename: `servicios-detalle-${dateStr}`,
        sheetName: 'Servicios',
        title: `Servicios Detalle — ${moment(dateStr).format('DD/MM/YYYY')}`,
      },
      formatters: {
        customer: (_val: unknown, row: ServicesDetailListItem) => row.customers?.name ?? '',
        type_service: (val: unknown) => (val ? dailyReportTypeLabels[val as string] ?? String(val) : ''),
        status: (val: unknown) => (val ? dailyReportRowStatusLabels[val as string] ?? String(val) : ''),
        created_at: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY HH:mm') : ''),
      },
    }),
    [currentParams, dateStr]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Servicios</DialogTitle>
          <DialogDescription>Servicios del parte diario con estado, tipo y cliente asignado.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-2">
          <label htmlFor="services-detail-date" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Fecha del parte:
          </label>
          <Input
            id="services-detail-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-[180px]"
          />
        </div>

        <div className="mt-2">
          <DataTable
            columns={columns}
            data={[]}
            totalRows={0}
            queryFn={tableQueryFn}
            queryKey={['services-detail-table', dateStr]}
            onStateChange={handleStateChange}
            facetedFilters={facetedFilters}
            exportConfig={exportConfig}
            searchPlaceholder="Buscar por descripción o remito..."
            showSearch
            showColumnToggle
            showFilterToggle
            emptyMessage="No hay servicios para esta fecha"
            paramNamespace={TABLE_ID}
            tableId={TABLE_ID}
            data-testid="services-detail-table"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
