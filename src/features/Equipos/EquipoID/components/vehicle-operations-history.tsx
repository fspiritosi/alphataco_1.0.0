'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getMaintenanceOrdersForEquipment,
  type EquipmentMaintenanceOrder,
  type EquipmentMaintenanceOrders,
  type EquipmentRejectedRequests,
} from '@/features/Equipos/EquipoID/lib/actions/vehicle-operations-actions';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Circle, ClipboardList, Eye, History, Play } from 'lucide-react';
import moment from 'moment';
import type React from 'react';
import { useMemo, useState } from 'react';
import { EquipmentOrderDetailDialog } from './equipment-order-detail-dialog';
import { VehicleRejectedRequestsTable } from './rejected-requests/VehicleRejectedRequestsTable';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

type OrderStatus =
  | 'scheduled'
  | 'in_workshop'
  | 'pending_workshop_validation'
  | 'pending_operations_validation'
  | 'operations_rejected'
  | 'workshop_rejected'
  // Ticket 676: el taller puede rechazar un pedido desde el paso "Por Programar".
  | 'rejected'
  | 'pending_scheduling'
  | 'date_confirmed'
  | 'completed';

const statusLabels: Record<OrderStatus, string> = {
  // pending_scheduling y date_confirmed pasaron a ser estados habituales con el
  // ticket 594: al programar la fecha el pedido va directo a date_confirmed.
  pending_scheduling: 'Por programar',
  date_confirmed: 'Pendiente de ingreso a taller',
  workshop_rejected: 'Rechazada por Taller',
  rejected: 'Rechazada por Taller',
  scheduled: 'Programada',
  in_workshop: 'En Taller',
  pending_workshop_validation: 'Pend. Validacion Taller',
  pending_operations_validation: 'Pend. Validacion Operaciones',
  operations_rejected: 'Rechazada por Ops',
  completed: 'Completada',
};

const statusVariants: Record<OrderStatus, BadgeVariant> = {
  pending_scheduling: 'secondary',
  date_confirmed: 'secondary',
  workshop_rejected: 'destructive',
  rejected: 'destructive',
  scheduled: 'warning',
  in_workshop: 'info',
  pending_workshop_validation: 'yellow',
  pending_operations_validation: 'yellow',
  operations_rejected: 'destructive',
  completed: 'success',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeOrderProgress(order: EquipmentMaintenanceOrder) {
  let totalRepairs = 0;
  let completedRepairs = 0;

  for (const item of order.maintenance_order_items || []) {
    if (item.is_diagnostico) continue;
    const wo = item.work_orders;
    if (wo && typeof wo === 'object' && !Array.isArray(wo) && 'work_order_items' in wo) {
      const woItems = wo.work_order_items;
      if (Array.isArray(woItems)) {
        for (const woItem of woItems) {
          if (woItem.work_order_item_repairs && Array.isArray(woItem.work_order_item_repairs)) {
            for (const repair of woItem.work_order_item_repairs) {
              totalRepairs++;
              if (repair.status === 'completed') completedRepairs++;
            }
          }
        }
      }
    }
  }

  return totalRepairs > 0 ? Math.round((completedRepairs / totalRepairs) * 100) : 0;
}

function countNonDiagnosticoItems(order: EquipmentMaintenanceOrder): number {
  return (order.maintenance_order_items || []).filter((i) => !i.is_diagnostico).length;
}

function countWorkOrders(order: EquipmentMaintenanceOrder): number {
  const woIds = new Set<string>();
  for (const item of order.maintenance_order_items || []) {
    const wo = item.work_orders;
    if (wo && typeof wo === 'object' && !Array.isArray(wo) && 'id' in wo) {
      woIds.add(wo.id as string);
    }
  }
  return woIds.size;
}

// ============================================================================
// COLUMNS
// ============================================================================

function getEquipmentOrderColumns({
  onViewDetail,
  onViewHistory,
}: {
  onViewDetail: (order: EquipmentMaintenanceOrder) => void;
  onViewHistory: (order: EquipmentMaintenanceOrder) => void;
}): ColumnDef<EquipmentMaintenanceOrder>[] {
  return [
    {
      accessorKey: 'order_number',
      id: 'order_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Orden" />,
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.order_number || '-'}</span>,
    },
    {
      accessorKey: 'status',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status as OrderStatus;
        return (
          <Badge variant={statusVariants[status] || 'default'}>{statusLabels[status] || status || 'Sin estado'}</Badge>
        );
      },
      filterFn: (row, _id, value) => {
        return value.includes(row.original.status ?? '');
      },
    },
    {
      accessorKey: 'workshop_entry_date',
      id: 'workshop_entry_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ingreso" />,
      cell: ({ row }) => {
        const date = row.original.workshop_entry_date;
        return <span className="text-sm">{date ? moment(date).format('DD/MM/YYYY') : '-'}</span>;
      },
    },
    {
      accessorKey: 'created_at',
      id: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creada" />,
      cell: ({ row }) => <span className="text-sm">{moment(row.original.created_at).format('DD/MM/YYYY')}</span>,
    },
    {
      id: 'Sectores',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sectores" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_order_items || [];
        const sectorMap = new Map<string, { name: string; seq: number; items: typeof items }>();
        items.forEach((item) => {
          const sectorId = item.assigned_sector_id;
          if (!sectorId) return;
          const sectorName =
            item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
              ? (item.workshop_sectors.name as string)
              : 'Sin sector';
          if (!sectorMap.has(sectorId)) {
            sectorMap.set(sectorId, { name: sectorName, seq: item.sector_sequence_order ?? 999, items: [] });
          }
          sectorMap.get(sectorId)!.items.push(item);
        });

        const sectors = Array.from(sectorMap.values()).sort((a, b) => a.seq - b.seq);
        if (sectors.length === 0) return <Badge variant="outline">Sin asignar</Badge>;

        const getSectorStatus = (sectorItems: typeof items): 'completed' | 'in_progress' | 'pending' => {
          const repairs = sectorItems.flatMap((item) => {
            const wo = item.work_orders;
            if (!wo || Array.isArray(wo)) return [];
            return (
              (wo.work_order_items || []) as Array<{
                maintenance_order_item_id?: string;
                work_order_item_repairs?: Array<{ status: string }>;
              }>
            )
              .filter((woi) => woi.maintenance_order_item_id === item.id)
              .flatMap((woi) => (woi.work_order_item_repairs || []) as Array<{ status: string }>);
          });
          if (repairs.length === 0) return 'pending';
          const completed = repairs.filter((r) => r.status === 'completed').length;
          if (completed === repairs.length) return 'completed';
          if (completed > 0 || repairs.some((r) => r.status === 'in_progress')) return 'in_progress';
          return 'pending';
        };

        return (
          <div className="flex items-center gap-1">
            {sectors.map((sector, idx) => {
              const sStatus = getSectorStatus(sector.items);
              const Icon = sStatus === 'completed' ? CheckCircle2 : sStatus === 'in_progress' ? Play : Circle;
              return (
                <Tooltip key={sector.name + idx}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {idx > 0 && <span className="text-muted-foreground text-[10px]">&rarr;</span>}
                      <Badge
                        variant={sStatus === 'completed' ? 'secondary' : sStatus === 'in_progress' ? 'info' : 'outline'}
                        className={`text-[10px] gap-1 ${sStatus === 'completed' ? 'opacity-50 line-through' : ''}`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {sector.name}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>
                      {sector.name} —{' '}
                      {sStatus === 'completed' ? 'Completado' : sStatus === 'in_progress' ? 'En progreso' : 'Pendiente'}
                    </span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'Items',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => {
        const count = countNonDiagnosticoItems(row.original);
        return <span className="text-sm">{count}</span>;
      },
    },
    {
      id: 'OTs',
      header: ({ column }) => <DataTableColumnHeader column={column} title="OTs" />,
      cell: ({ row }) => {
        const count = countWorkOrders(row.original);
        return <span className="text-sm">{count}</span>;
      },
    },
    {
      id: 'Progreso',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso" />,
      cell: ({ row }) => {
        const percent = computeOrderProgress(row.original);
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground">{percent}%</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onViewDetail(row.original)}>
            <Eye className="h-4 w-4 mr-1" />
            Detalle
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewHistory(row.original)}
                className="text-purple-600 hover:text-purple-700"
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver historial completo</TooltipContent>
          </Tooltip>
        </div>
      ),
      enableSorting: false,
    },
  ];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface VehicleOperationsHistoryProps {
  equipmentId: string;
  initialData?: EquipmentMaintenanceOrders;
  initialRejectedRequests?: EquipmentRejectedRequests;
}

interface MaintenanceOrdersSubTabProps {
  equipmentId: string;
  initialData?: EquipmentMaintenanceOrders;
}

/**
 * Sub-tab "Órdenes de Mantenimiento": historial de órdenes generadas para el equipo.
 */
function MaintenanceOrdersSubTab({ equipmentId, initialData }: MaintenanceOrdersSubTabProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['equipment-maintenance-orders', equipmentId],
    queryFn: () => getMaintenanceOrdersForEquipment(equipmentId),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedOrder, setSelectedOrder] = useState<EquipmentMaintenanceOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<EquipmentMaintenanceOrder | null>(null);

  const handleViewDetail = (order: EquipmentMaintenanceOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleViewHistory = (order: EquipmentMaintenanceOrder) => {
    setHistoryOrder(order);
  };

  const columns = useMemo(
    () => getEquipmentOrderColumns({ onViewDetail: handleViewDetail, onViewHistory: handleViewHistory }),
    []
  );

  const statusOptions = useMemo(() => {
    const found = new Set<string>();
    (orders || []).forEach((order) => {
      if (order.status) found.add(order.status);
    });
    return Array.from(found).map((s) => ({
      label: statusLabels[s as OrderStatus] || s,
      value: s,
    }));
  }, [orders]);

  if (!isLoading && (!orders || orders.length === 0)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No hay ordenes de mantenimiento para este equipo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="equipment-operations-history"
        savedVisibility={{}}
        toolbarOptions={{
          initialVisibleFilters: ['Estado'],
          filterableColumns: [
            {
              columnId: 'Estado',
              title: 'Estado',
              options: statusOptions,
            },
          ],
          showViewOptions: true,
        }}
      />

      <EquipmentOrderDetailDialog
        order={selectedOrder}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedOrder(null);
        }}
        onViewHistory={(order) => {
          setDialogOpen(false);
          setSelectedOrder(null);
          setHistoryOrder(order);
        }}
      />

      <ActivityHistoryModal
        open={!!historyOrder}
        onClose={() => setHistoryOrder(null)}
        maintenanceOrderId={historyOrder?.id}
        maintenanceRequestId={historyOrder?.maintenance_requests?.id}
        title="Historial Completo"
      />
    </TooltipProvider>
  );
}

/**
 * Tab "Historial de Mantenimiento" del legajo del equipo.
 *
 * Se divide en dos sub-tabs:
 * - Órdenes de Mantenimiento: el trabajo que efectivamente se ejecutó o está en curso.
 * - Solicitudes Rechazadas: lo que se pidió y no se aprobó. Estas solicitudes no
 *   generan orden, y se quitaron del paso "Validar Solicitud" de Operaciones, así
 *   que este es el único lugar del sistema donde quedan registradas.
 *
 * Las sub-tabs no declaran moduleSlug/tabSlug: heredan la protección de la tab
 * padre (mantenimiento / ordenes_mantenimiento).
 */
export function VehicleOperationsHistory({
  equipmentId,
  initialData,
  initialRejectedRequests,
}: VehicleOperationsHistoryProps) {
  return (
    <TabsManagerClientSide
      paramName="mant_subtab"
      defaultTab="orders"
      tabs={[
        {
          value: 'orders',
          label: 'Órdenes de Mantenimiento',
          content: <MaintenanceOrdersSubTab equipmentId={equipmentId} initialData={initialData} />,
        },
        {
          value: 'rejected',
          label: 'Solicitudes Rechazadas',
          content: <VehicleRejectedRequestsTable equipmentId={equipmentId} initialData={initialRejectedRequests} />,
        },
      ]}
    />
  );
}
