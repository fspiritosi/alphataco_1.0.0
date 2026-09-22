'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { EquipmentMaintenanceOrder } from '@/features/Equipos/EquipoID/lib/actions/vehicle-operations-actions';
import { getValidationHistory, type ValidationHistoryData } from '@/features/Mantenimiento/MaintenanceOrders/actions/queries.server';
import {
  SectorTimeline,
  type SectorStatus,
  type SectorTimelineItem,
} from '@/features/Mantenimiento/MaintenanceOrders/components/SectorTimeline';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  MessageSquare,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react';
import moment from 'moment';
import type React from 'react';
import { useMemo, useState } from 'react';

interface EquipmentOrderDetailDialogProps {
  order: EquipmentMaintenanceOrder | null;
  open: boolean;
  onClose: () => void;
  onViewHistory?: (order: EquipmentMaintenanceOrder) => void;
}

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

type OrderStatus =
  | 'scheduled'
  | 'in_workshop'
  | 'pending_workshop_validation'
  | 'pending_operations_validation'
  | 'operations_rejected'
  | 'completed';

const orderStatusLabels: Record<OrderStatus, string> = {
  scheduled: 'Programada',
  in_workshop: 'En Taller',
  pending_workshop_validation: 'Pend. Validacion Taller',
  pending_operations_validation: 'Pend. Validacion Operaciones',
  operations_rejected: 'Rechazada por Ops',
  completed: 'Completada',
};

const orderStatusVariants: Record<OrderStatus, BadgeVariant> = {
  scheduled: 'warning',
  in_workshop: 'info',
  pending_workshop_validation: 'yellow',
  pending_operations_validation: 'yellow',
  operations_rejected: 'destructive',
  completed: 'success',
};

const repairStatusBadgeVariants: Record<string, BadgeVariant> = {
  pending: 'secondary',
  pending_approval: 'warning',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  rejected: 'destructive',
  reassignment_requested: 'destructive',
  blocked: 'outline',
};

const repairStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  pending_approval: 'Pend. Aprobacion',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
  reassignment_requested: 'Reasignacion',
  blocked: 'Bloqueado',
};

const sectorStatusBadge: Record<SectorStatus, BadgeVariant> = {
  blocked: 'outline',
  pending: 'secondary',
  in_progress: 'warning',
  paused: 'outline',
  completed: 'success',
};

type WOStatus = 'pending' | 'in_progress' | 'paused' | 'completed';

const woStatusLabels: Record<WOStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  paused: 'Pausada',
  completed: 'Completada',
};

const woStatusVariants: Record<WOStatus, BadgeVariant> = {
  pending: 'outline',
  in_progress: 'default',
  paused: 'yellow',
  completed: 'success',
};

// ============================================================================
// HELPER TYPES
// ============================================================================

interface SectorGroup {
  sectorId: string;
  sectorName: string;
  sequenceOrder: number;
  items: EquipmentMaintenanceOrder['maintenance_order_items'];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRepairsForItem(item: EquipmentMaintenanceOrder['maintenance_order_items'][number]) {
  const wo = item.work_orders;
  if (!wo || Array.isArray(wo)) return [];
  return (
    (wo.work_order_items || []) as Array<{
      maintenance_order_item_id?: string;
      work_order_item_repairs?: Array<{
        id: string;
        status: string;
        is_diagnostico?: boolean | null;
        is_operator_added?: boolean | null;
        types_of_repairs?: { id: string; name: string; autorizable?: boolean | null } | null;
      }>;
    }>
  )
    .filter((woi) => woi.maintenance_order_item_id === item.id)
    .flatMap((woi) => woi.work_order_item_repairs || []);
}

function getGroupRepairs(groupItems: EquipmentMaintenanceOrder['maintenance_order_items']) {
  return groupItems.flatMap(getRepairsForItem);
}

function buildSectorGroups(items: EquipmentMaintenanceOrder['maintenance_order_items']): SectorGroup[] {
  const groups = new Map<string, SectorGroup>();

  items.forEach((item) => {
    const sectorId = item.assigned_sector_id;
    if (!sectorId) return;

    const sectorName =
      item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
        ? (item.workshop_sectors.name as string)
        : 'Sin sector';

    if (!groups.has(sectorId)) {
      groups.set(sectorId, {
        sectorId,
        sectorName,
        sequenceOrder: item.sector_sequence_order ?? 999,
        items: [],
      });
    }
    groups.get(sectorId)!.items.push(item);
  });

  return Array.from(groups.values()).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

function buildTimelineData(sectorGroups: SectorGroup[]): SectorTimelineItem[] {
  return sectorGroups.map((group, index) => {
    const allRepairs = getGroupRepairs(group.items);
    const totalTasks = allRepairs.length || group.items.length;
    const completedTasks = allRepairs.filter((r) => r.status === 'completed').length;
    const diagItem = group.items.find((i) => i.is_diagnostico);
    const diagRepairs = diagItem ? getRepairsForItem(diagItem) : [];
    const diagCompleted = diagRepairs.some((r) => r.status === 'completed');

    let sectorStatus: SectorStatus = 'pending';
    if (completedTasks === totalTasks && totalTasks > 0) {
      sectorStatus = 'completed';
    } else if (completedTasks > 0) {
      sectorStatus = 'in_progress';
    } else if (index > 0) {
      const prevGroup = sectorGroups[index - 1];
      const prevRepairs = getGroupRepairs(prevGroup.items);
      const prevTotal = prevRepairs.length || prevGroup.items.length;
      const prevCompleted = prevRepairs.filter((r) => r.status === 'completed').length;
      if (prevCompleted < prevTotal) {
        sectorStatus = 'blocked';
      }
    }

    return {
      sectorId: group.sectorId,
      sectorName: group.sectorName,
      sequenceOrder: group.sequenceOrder,
      status: sectorStatus,
      totalTasks,
      completedTasks,
      diagnosticoCompleted: diagCompleted,
    };
  });
}

function getSectorTasks(group: SectorGroup) {
  const tasks: Array<{
    id: string;
    repairTypeName: string;
    status: string;
    isDiagnostico: boolean;
    isAutorizable: boolean;
    isOperatorAdded: boolean;
  }> = [];

  group.items.forEach((item) => {
    const repairs = getRepairsForItem(item);

    if (repairs.length > 0) {
      repairs.forEach((repair) => {
        tasks.push({
          id: repair.id,
          repairTypeName: repair.is_diagnostico
            ? 'DIAGNOSTICO'
            : String(repair.types_of_repairs?.name || item.description || 'Sin descripcion'),
          status: String(repair.status),
          isDiagnostico: repair.is_diagnostico ?? false,
          isAutorizable: repair.types_of_repairs?.autorizable ?? false,
          isOperatorAdded: repair.is_operator_added ?? false,
        });
      });
    } else {
      tasks.push({
        id: item.id,
        repairTypeName: item.is_diagnostico
          ? 'DIAGNOSTICO'
          : String(item.types_of_repairs?.name || item.description || 'Sin descripcion'),
        status: 'pending',
        isDiagnostico: item.is_diagnostico ?? false,
        isAutorizable: item.types_of_repairs?.autorizable ?? false,
        isOperatorAdded: false,
      });
    }
  });

  return tasks;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ReadonlySectorCard({
  sectorName,
  sequenceOrder,
  status,
  tasks,
  diagnosticoCompleted,
}: {
  sectorName: string;
  sequenceOrder: number;
  status: SectorStatus;
  tasks: ReturnType<typeof getSectorTasks>;
  diagnosticoCompleted: boolean;
}) {
  const [isOpen, setIsOpen] = useState(status === 'in_progress' || status === 'pending');

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const diagnosticoTask = tasks.find((t) => t.isDiagnostico);
  const regularTasks = tasks.filter((t) => !t.isDiagnostico);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Orden {sequenceOrder}
                </Badge>
                <span>{sectorName}</span>
                <Badge variant={sectorStatusBadge[status]}>
                  {status === 'blocked'
                    ? 'Bloqueado'
                    : status === 'pending'
                      ? 'Pendiente'
                      : status === 'in_progress'
                        ? 'En progreso'
                        : 'Completado'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-normal">
                  {completedTasks}/{totalTasks} tareas
                </span>
                <Progress value={progressPercent} className="w-24 h-2" />
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {diagnosticoTask && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border-l-4 border-blue-500">
                <ShieldAlert className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">DIAGNOSTICO</span>
                <Badge variant={repairStatusBadgeVariants[diagnosticoTask.status] || 'outline'}>
                  {repairStatusLabels[diagnosticoTask.status] || diagnosticoTask.status}
                </Badge>
                {!diagnosticoCompleted && status !== 'blocked' && (
                  <span className="text-xs text-muted-foreground ml-auto">Bloquea tareas restantes</span>
                )}
              </div>
            )}

            {regularTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm flex-1">{task.repairTypeName}</span>
                {task.isAutorizable && (
                  <Badge variant="warning" className="text-[10px]">
                    Autorizable
                  </Badge>
                )}
                {task.isOperatorAdded && (
                  <Badge variant="outline" className="text-[10px]">
                    Agregado
                  </Badge>
                )}
                <Badge variant={repairStatusBadgeVariants[task.status] || 'outline'}>
                  {repairStatusLabels[task.status] || task.status}
                </Badge>
              </div>
            ))}

            {regularTasks.length === 0 && !diagnosticoTask && (
              <p className="text-sm text-muted-foreground text-center py-2">Sin tareas asignadas</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ValidationHistoryTimeline({ history }: { history: ValidationHistoryData }) {
  if (history.length === 0) return null;

  const actionLabels: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
    workshop_approved: { label: 'Aprobado por Jefe de Taller', icon: CheckCircle2, color: 'text-emerald-600' },
    operations_approved: { label: 'Aprobado por Operaciones', icon: CheckCircle2, color: 'text-emerald-600' },
    workshop_item_rejected: {
      label: 'Items rechazados por Jefe de Taller',
      icon: XCircle,
      color: 'text-red-600',
    },
    operations_item_rejected: {
      label: 'Items rechazados por Operaciones',
      icon: XCircle,
      color: 'text-red-600',
    },
    workshop_agreed_ops_rejection: {
      label: 'Jefe de Taller de acuerdo con rechazo',
      icon: AlertTriangle,
      color: 'text-amber-600',
    },
    workshop_disagreed_ops_rejection: {
      label: 'Jefe de Taller en desacuerdo con rechazo',
      icon: AlertTriangle,
      color: 'text-amber-600',
    },
    status_change: { label: 'Cambio de estado', icon: Clock, color: 'text-blue-600' },
  };

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Historial de Validaciones
        </h4>
        <div className="space-y-2">
          {history.map((entry) => {
            const config = actionLabels[entry.action_type] || {
              label: entry.action_type,
              icon: Clock,
              color: 'text-muted-foreground',
            };
            const Icon = config.icon;
            const performer = entry.performed_by_profile as {
              firstname?: string | null;
              lastname?: string | null;
            } | null;
            const performerName = performer
              ? `${performer.firstname || ''} ${performer.lastname || ''}`.trim()
              : 'Sistema';

            const metadata = entry.metadata as {
              rejected_items?: Array<{ repair_name: string; sector_name: string; comment: string }>;
            } | null;
            const rejectedItems = metadata?.rejected_items || [];

            return (
              <div key={entry.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`font-medium ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {moment(entry.performed_at).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">por {performerName}</div>
                    {entry.notes && <p className="text-xs mt-1 text-muted-foreground italic">{entry.notes}</p>}
                    {rejectedItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {rejectedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-destructive/5 border border-destructive/10 rounded px-2 py-1"
                          >
                            <span className="font-medium">{item.repair_name}</span>
                            <span className="text-muted-foreground"> ({item.sector_name})</span>
                            {item.comment && <span className="text-destructive/80"> - {item.comment}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EquipmentOrderDetailDialog({ order, open, onClose, onViewHistory }: EquipmentOrderDetailDialogProps) {
  const items = order?.maintenance_order_items || [];
  const status = (order?.status ?? '') as OrderStatus;

  // Validation history query
  const { data: validationHistory } = useQuery({
    queryKey: ['maintenance', 'validation-history', order?.id],
    queryFn: () => (order ? getValidationHistory(order.id) : []),
    enabled: !!order?.id && open,
  });

  // Group items by sector
  const sectorGroups = useMemo(() => buildSectorGroups(items), [items]);

  // Timeline data
  const timelineData = useMemo(() => buildTimelineData(sectorGroups), [sectorGroups]);

  // Collect unique work orders
  const workOrders = useMemo(() => {
    const woMap = new Map<
      string,
      {
        id: string;
        order_number: string | null;
        status: string | null;
        started_at: string | null;
        completed_at: string | null;
      }
    >();

    items.forEach((item) => {
      const wo = item.work_orders;
      if (wo && typeof wo === 'object' && !Array.isArray(wo) && 'id' in wo) {
        if (!woMap.has(wo.id as string)) {
          woMap.set(wo.id as string, {
            id: wo.id as string,
            order_number: (wo as Record<string, unknown>).order_number as string | null,
            status: (wo as Record<string, unknown>).status as string | null,
            started_at: (wo as Record<string, unknown>).started_at as string | null,
            completed_at: (wo as Record<string, unknown>).completed_at as string | null,
          });
        }
      }
    });

    return Array.from(woMap.values());
  }, [items]);

  // Collect comments from maintenance_request_items
  const requestComments = useMemo(() => {
    const isManual = order?.maintenance_requests?.source === 'manual';
    const comments: Array<{ type: 'driver' | 'validator'; text: string; itemDescription: string }> = [];
    const seenTexts = new Set<string>();

    items.forEach((item) => {
      const reqItem = item.maintenance_request_items as
        | { driver_comment?: string | null; validator_comment?: string | null; description?: string | null }
        | null
        | undefined;
      if (!reqItem) return;
      const itemDesc = item.types_of_repairs?.name || item.description || reqItem.description || 'Item';

      if (reqItem.driver_comment) {
        const key = `${reqItem.driver_comment.trim().toLowerCase()}-${itemDesc}`;
        if (!seenTexts.has(key)) {
          comments.push({
            type: isManual ? 'validator' : 'driver',
            text: reqItem.driver_comment,
            itemDescription: itemDesc,
          });
          seenTexts.add(key);
        }
      }
      if (reqItem.validator_comment) {
        const normalized = reqItem.validator_comment.trim().toLowerCase();
        const key = `${normalized}-${itemDesc}`;
        const driverNormalized = reqItem.driver_comment?.trim().toLowerCase();
        if (!seenTexts.has(key) && normalized !== driverNormalized) {
          comments.push({ type: 'validator', text: reqItem.validator_comment, itemDescription: itemDesc });
          seenTexts.add(key);
        }
      }
    });
    return comments;
  }, [items, order?.maintenance_requests?.source]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{order.order_number || 'Sin numero'}</span>
            <Badge variant={orderStatusVariants[status] || 'default'}>{orderStatusLabels[status] || status}</Badge>
            {onViewHistory && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto text-purple-600 hover:text-purple-700"
                onClick={() => onViewHistory(order)}
              >
                <History className="h-4 w-4 mr-1" />
                Historial
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Info general */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ingreso:</span>{' '}
                <span className="font-medium">
                  {order.workshop_entry_date ? moment(order.workshop_entry_date).format('DD/MM/YYYY') : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Creada:</span>{' '}
                <span className="font-medium">{moment(order.created_at).format('DD/MM/YYYY')}</span>
              </div>
              {order.operations_validated_at && (
                <div>
                  <span className="text-muted-foreground">Cerrada:</span>{' '}
                  <span className="font-medium">{moment(order.operations_validated_at).format('DD/MM/YYYY')}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Fuente:</span>{' '}
                <span className="font-medium">
                  {order.maintenance_requests?.source === 'preventive'
                    ? 'Preventivo'
                    : order.maintenance_requests?.source === 'checklist'
                      ? 'Checklist'
                      : order.maintenance_requests?.source === 'manual'
                        ? 'Manual'
                        : order.maintenance_requests?.source || '-'}
                </span>
              </div>
            </div>

            <Separator />

            {/* Timeline de sectores */}
            {timelineData.length > 0 && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Secuencia de Sectores</h4>
                  <SectorTimeline sectors={timelineData} />
                </div>
                <Separator />
              </>
            )}

            {/* Sector cards */}
            <div className="space-y-3">
              {sectorGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin sectores asignados</p>
              ) : (
                sectorGroups.map((group) => {
                  const timelineItem = timelineData.find((t) => t.sectorId === group.sectorId);
                  return (
                    <ReadonlySectorCard
                      key={group.sectorId}
                      sectorName={group.sectorName}
                      sequenceOrder={group.sequenceOrder}
                      status={timelineItem?.status || 'pending'}
                      tasks={getSectorTasks(group)}
                      diagnosticoCompleted={timelineItem?.diagnosticoCompleted || false}
                    />
                  );
                })
              )}
            </div>

            {/* Ordenes de Trabajo */}
            {workOrders.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Ordenes de Trabajo
                  </h4>
                  <div className="grid gap-2">
                    {workOrders.map((wo) => {
                      const woStatus = wo.status as WOStatus;
                      return (
                        <div
                          key={wo.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono">{wo.order_number || '-'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {wo.started_at && (
                              <span className="text-xs text-muted-foreground">
                                Inicio: {moment(wo.started_at).format('DD/MM/YYYY')}
                              </span>
                            )}
                            {wo.completed_at && (
                              <span className="text-xs text-muted-foreground">
                                Fin: {moment(wo.completed_at).format('DD/MM/YYYY')}
                              </span>
                            )}
                            <Badge variant={woStatusVariants[woStatus] || 'outline'}>
                              {woStatusLabels[woStatus] || woStatus || 'Sin estado'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Comentarios de la solicitud */}
            {requestComments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentarios de la Solicitud
                  </h4>
                  {requestComments.map((comment, idx) => (
                    <div
                      key={idx}
                      className={`text-sm p-2.5 rounded-md ${
                        comment.type === 'driver'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span
                          className={`text-xs font-medium ${
                            comment.type === 'driver'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {comment.type === 'driver'
                            ? 'Chofer'
                            : order.maintenance_requests?.source === 'manual'
                              ? 'Supervisor'
                              : 'Validador'}
                        </span>
                        <span className="text-xs text-muted-foreground">&middot; {comment.itemDescription}</span>
                      </div>
                      <p className="text-sm italic">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Informacion de cierre */}
            {(order.workshop_validated_at || order.operations_validated_at) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Informacion de Validaciones</h4>
                  {order.workshop_validated_at && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Validado por Jefe de Taller</div>
                      <div className="text-xs text-muted-foreground">
                        Fecha: {moment(order.workshop_validated_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                      {order.workshop_validation_notes && (
                        <div className="text-xs mt-1">Notas: {order.workshop_validation_notes}</div>
                      )}
                    </div>
                  )}
                  {order.operations_validated_at && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Validado por Operaciones</div>
                      <div className="text-xs text-muted-foreground">
                        Fecha: {moment(order.operations_validated_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                      {order.operations_validation_notes && (
                        <div className="text-xs mt-1">Notas: {order.operations_validation_notes}</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Historial de validaciones */}
            {validationHistory && validationHistory.length > 0 && (
              <ValidationHistoryTimeline history={validationHistory} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
