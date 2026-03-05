'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrderDetailDialog } from '@/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog';
import { calculateRepairProgress } from '@/features/Mantenimiento/utils/repairProgress';
import { DataTable } from '@/shared/components/common/DataTable';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import type { ValidationOrdersData } from '../actions/actionsServer';

// ============================================================================
// TYPES
// ============================================================================

export type ValidationOrder = ValidationOrdersData[number];

// ============================================================================
// HELPERS
// ============================================================================

function getSectors(order: ValidationOrder): string[] {
  const items = order.maintenance_order_items ?? [];
  const names = items.map((item) => item.workshop_sectors?.name).filter(Boolean) as string[];
  return [...new Set(names)];
}

function getVehicleLabel(order: ValidationOrder): string {
  const v = order.vehicles;
  if (!v) return 'Sin identificar';
  if (v.domain) return v.domain;
  if (v.serie) return v.serie;
  if (v.intern_number) return `N° ${v.intern_number}`;
  return 'Sin identificar';
}

// ============================================================================
// TABLE ID
// ============================================================================

const TABLE_ID = 'approval-validation-orders';

// ============================================================================
// INNER TABLE COMPONENT (tipado correcto via genérico)
// ============================================================================

/**
 * Componente interno tipado para evitar casts problemáticos.
 * DataTable requiere TData extends Record<string, unknown> — ValidationOrder lo cumple.
 */
function ValidationOrdersTable({
  data,
  onViewDetail,
}: {
  data: ValidationOrder[];
  onViewDetail: (order: ValidationOrder) => void;
}) {
  const columns: ColumnDef<ValidationOrder>[] = useMemo(
    () => [
      // ── N° Orden ───────────────────────────────────────────────────────────
      {
        accessorKey: 'order_number',
        id: 'order_number',
        meta: { title: 'N° Orden' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
        cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.order_number ?? '-'}</span>,
      },

      // ── Equipo / Vehículo ─────────────────────────────────────────────────
      {
        id: 'vehicle',
        accessorFn: (row) => getVehicleLabel(row),
        meta: { title: 'Equipo' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
        cell: ({ row }) => {
          const vehicle = row.original.vehicles;
          return (
            <div className="flex flex-col">
              <span className="font-medium">{getVehicleLabel(row.original)}</span>
              {vehicle?.intern_number && (
                <span className="text-xs text-muted-foreground">#{vehicle.intern_number}</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },

      // ── Sectores (calculado desde items) ──────────────────────────────────
      {
        id: 'sectors',
        accessorFn: (row) => getSectors(row).join(', '),
        meta: { title: 'Sectores' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sectores" />,
        cell: ({ row }) => {
          const sectorList = getSectors(row.original);
          if (sectorList.length === 0) return <Badge variant="outline">Sin asignar</Badge>;
          return (
            <div className="flex flex-wrap gap-1">
              {sectorList.map((name) => (
                <Badge key={name} variant="secondary" className="text-[10px]">
                  {name}
                </Badge>
              ))}
            </div>
          );
        },
        enableSorting: false,
      },

      // ── Progreso ──────────────────────────────────────────────────────────
      {
        id: 'progress',
        accessorFn: (row) => calculateRepairProgress(row.maintenance_order_items).percent,
        meta: { title: 'Progreso' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso" />,
        cell: ({ row }) => {
          const { percent, completed, total } = calculateRepairProgress(row.original.maintenance_order_items);
          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 min-w-[120px] cursor-default">
                    <Progress value={percent} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums">{percent}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {completed} de {total} reparaciones completadas
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        enableSorting: false,
      },

      // ── Fecha ingreso a taller ────────────────────────────────────────────
      {
        accessorKey: 'workshop_entry_date',
        id: 'workshop_entry_date',
        meta: { title: 'Ingreso a Taller' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ingreso a Taller" />,
        cell: ({ row }) => {
          const date = row.original.workshop_entry_date;
          return <span className="text-sm">{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
        },
      },

      // ── Acciones ──────────────────────────────────────────────────────────
      {
        id: 'actions',
        meta: { title: '', excludeFromExport: true },
        enableSorting: false,
        enableHiding: false,
        header: 'Acciones',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail(row.original)}
            title="Ver detalle y validar orden"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver detalle
          </Button>
        ),
      },
    ],
    [onViewDetail]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={data.length}
      searchParams={{}}
      paramNamespace={TABLE_ID}
      tableId={TABLE_ID}
      searchPlaceholder="Buscar por N° orden o equipo..."
      emptyMessage="No hay órdenes pendientes de validación"
      showFilterToggle={false}
      showColumnToggle={false}
      showSearch={false}
    />
  );
}

// ============================================================================
// PUBLIC COMPONENT
// ============================================================================

interface Props {
  validationOrders: ValidationOrdersData;
}

export function _ValidationOrdersDataTable({ validationOrders }: Props) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleViewDetail = useCallback((order: ValidationOrder) => {
    setSelectedOrderId(order.id);
  }, []);

  return (
    <>
      <ValidationOrdersTable data={validationOrders} onViewDetail={handleViewDetail} />

      <OrderDetailDialog
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        context="workshop"
      />
    </>
  );
}
