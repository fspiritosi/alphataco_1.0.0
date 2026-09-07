'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getRejectedRequestsForEquipment,
  type EquipmentRejectedRequest,
  type EquipmentRejectedRequests,
} from '@/features/Equipos/EquipoID/lib/actions/vehicle-operations-actions';
import { DataTable, type DataTableFacetedFilterConfig } from '@/shared/components/common/DataTable';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { XCircle } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import {
  HIDDEN_COLUMNS_BY_DEFAULT,
  buildRejectedByFilter,
  buildRejectionTypeFilter,
  buildSourceFilter,
  getRejectedRequestsColumns,
} from './columns';

// DataTable requiere TData extends Record<string, unknown>.
type RejectedRequestRecord = EquipmentRejectedRequest & Record<string, unknown>;

interface VehicleRejectedRequestsTableProps {
  equipmentId: string;
  initialData?: EquipmentRejectedRequests;
}

/**
 * Sub-tab "Solicitudes Rechazadas" del historial de mantenimiento del equipo.
 *
 * Muestra las solicitudes de mantenimiento rechazadas (totales o parciales) para
 * este equipo. Es el único lugar del sistema donde quedan registradas, ya que se
 * quitaron del paso "Validar Solicitud" de Operaciones.
 *
 * Tabla chica (todo el historial de un solo equipo): sin paginación server-side,
 * sin facets lazy-load — todo se resuelve en memoria (`inMemory`).
 */
export function VehicleRejectedRequestsTable({ equipmentId, initialData }: VehicleRejectedRequestsTableProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['equipment-rejected-requests', equipmentId],
    queryFn: () => getRejectedRequestsForEquipment(equipmentId),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo(() => (data ?? []) as RejectedRequestRecord[], [data]);

  const columns = useMemo(() => getRejectedRequestsColumns() as ColumnDef<RejectedRequestRecord>[], []);

  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      buildRejectionTypeFilter(),
      buildSourceFilter(),
      buildRejectedByFilter(rows),
      {
        columnId: 'rejectionReason',
        title: 'Motivo',
        type: 'text',
        placeholder: 'Buscar en el motivo...',
      },
    ],
    [rows]
  );

  const exportConfig = useMemo(
    () => ({
      fetchAllData: async () => rows,
      options: {
        filename: 'solicitudes-rechazadas',
        sheetName: 'Solicitudes Rechazadas',
        title: 'Solicitudes de Mantenimiento Rechazadas',
      },
      formatters: {
        rejectedAt: (val: unknown) => (val ? moment(val as string | Date).format('DD/MM/YYYY') : ''),
        rejectionType: (val: unknown) => (val === 'total' ? 'Total' : 'Parcial'),
        source: (val: unknown) => {
          const labels: Record<string, string> = { checklist: 'Checklist', manual: 'Manual', preventive: 'Preventivo' };
          return val ? labels[val as string] ?? String(val) : '';
        },
      },
    }),
    [rows]
  );

  // Columnas de contexto: se cargan pero arrancan ocultas, se activan desde el
  // selector de columnas de la tabla.
  const initialColumnVisibility = useMemo(
    () => Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((columnId) => [columnId, false])),
    []
  );

  // Sin datos todavía y la query en vuelo: no se puede afirmar "no hay rechazos"
  // mientras se está averiguando. Solo aplica si el server no mandó `initialData`.
  if (isLoading && rows.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <XCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Este equipo no tiene solicitudes de mantenimiento rechazadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <DataTable
        columns={columns}
        data={rows}
        totalRows={rows.length}
        facetedFilters={facetedFilters}
        searchPlaceholder="Buscar por motivo, ítems u origen..."
        showSearch
        showFilterToggle
        emptyMessage="No hay solicitudes rechazadas para este equipo."
        exportConfig={exportConfig}
        initialColumnVisibility={initialColumnVisibility}
        tableId="equipment-rejected-requests"
        paramNamespace="equipment-rejected-requests"
        inMemory
      />
    </TooltipProvider>
  );
}
