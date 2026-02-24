'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getMaintenanceOrderActivityLog,
  getMaintenanceOrderFullActivityLog,
  getMaintenanceRequestFullActivityLog,
  getWorkOrderFullActivityLog,
  type MaintenanceRequestOrigin,
} from '@/features/Mantenimiento/Operaciones/actions/actionsServer';
import { formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  GitBranch,
  LogIn,
  Pause,
  Play,
  Truck,
  User,
  XCircle,
} from 'lucide-react';

interface ActivityHistoryModalProps {
  open: boolean;
  onClose: () => void;
  maintenanceOrderId?: string | null;
  maintenanceRequestId?: string | null;
  workOrderId?: string | null;
  title?: string;
}

// Mapeo de estados (status) a español
const statusLabels: Record<string, string> = {
  // Estados de maintenance_orders
  pending_scheduling: 'Pendiente de programación',
  scheduled: 'Programado',
  date_confirmed: 'Fecha confirmada',
  in_workshop: 'En taller',
  completed: 'Completado',
  rejected: 'Rechazado',
  // Estados de work_orders
  pending: 'Pendiente',
  in_progress: 'En progreso',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

// Función para obtener el label en español de un status
function getStatusLabel(status: string | null): string {
  if (!status) return '';
  return statusLabels[status] || status;
}

// Mapeo de action_type a configuración visual
const actionConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }
> = {
  // Acciones de maintenance_orders (Pedido/Solicitud)
  created: { label: 'Pedido creado', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  scheduled: { label: 'Fecha programada', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  date_confirmed: { label: 'Fecha confirmada', icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  date_rejected: { label: 'Fecha rechazada', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  workshop_entry: { label: 'Ingreso a taller', icon: LogIn, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  rejected: { label: 'Pedido rechazado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },

  // Acciones de work_orders (Orden de Trabajo)
  work_order_created: {
    label: 'Orden de trabajo creada',
    icon: GitBranch,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  started: { label: 'Trabajo iniciado', icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  paused: { label: 'Trabajo pausado', icon: Pause, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  resumed: { label: 'Trabajo reanudado', icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  completed: { label: 'Completado', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  completed_partial: {
    label: 'Completado parcialmente',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },

  // Otras acciones
  status_changed: { label: 'Estado actualizado', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  comment_added: { label: 'Comentario agregado', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

// Tipo para el performer (puede venir como objeto o array de Supabase)
type PerformerType =
  | { id: string; fullname: string | null; email: string | null }
  | { id: string; fullname: string | null; email: string | null }[]
  | null;

// Helper para extraer el nombre del performer
function getPerformerName(performer: PerformerType): string | null {
  if (!performer) return null;
  if (Array.isArray(performer)) {
    return performer[0]?.fullname || null;
  }
  return performer.fullname;
}

// Componente para renderizar un item del timeline
function TimelineItem({
  entry,
  isLast,
  showSource,
}: {
  entry: {
    id: string;
    action_type: string;
    performed_at: string;
    performer?: PerformerType;
    notes?: string | null;
    rejection_reason?: string | null;
    new_status?: string | null;
    previous_status?: string | null;
    metadata?: Record<string, unknown> | null;
    source?: 'order' | 'work_order';
    sourceLabel?: string;
  };
  isLast: boolean;
  showSource?: boolean;
}) {
  const config = actionConfig[entry.action_type] || {
    label: entry.action_type,
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  };
  const Icon = config.icon;
  const performerName = getPerformerName(entry.performer ?? null);

  // Extraer datos del metadata si existen
  const metadata = entry.metadata as Record<string, unknown> | null;
  const pauseReason = metadata?.pause_reason as string | undefined;
  const totalPausedTime = metadata?.total_paused_time as string | undefined;
  const scheduledDate = metadata?.scheduled_date as string | undefined;
  const kilometerAtEntry = metadata?.kilometer_at_entry as string | undefined;
  const engineHoursAtEntry = metadata?.engine_hours_at_entry as number | undefined;

  return (
    <div className="relative flex items-start gap-3 pl-1">
      {/* Línea conectora */}
      {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}

      {/* Icono del timeline */}
      <div
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${config.bgColor} ${config.color.replace('text-', 'border-')}`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      {/* Contenido */}
      <div className="flex-1 pt-0.5 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{config.label}</span>

          {/* Badge de source si se muestra */}
          {showSource && entry.sourceLabel && (
            <Badge variant={entry.source === 'order' ? 'secondary' : 'default'} className="text-xs">
              {entry.source === 'order' ? 'Pedido' : 'OT'}
            </Badge>
          )}

          {/* Badge de estado en español */}
          {entry.new_status && (
            <Badge variant="outline" className="text-xs">
              {getStatusLabel(entry.new_status)}
            </Badge>
          )}
        </div>

        {/* Usuario que realizó la acción */}
        {performerName && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" />
            {performerName}
          </p>
        )}

        {/* Notas */}
        {entry.notes && entry.notes !== config.label && (
          <p className="text-sm text-muted-foreground mt-1 italic">&ldquo;{entry.notes}&rdquo;</p>
        )}

        {/* Motivo de rechazo */}
        {entry.rejection_reason && (
          <div className="mt-1 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-700 dark:text-red-300">
            <span className="font-medium">Motivo:</span> {entry.rejection_reason}
          </div>
        )}

        {/* Motivo de pausa - solo mostrar en acción paused, sin el tiempo (aún no se calculó) */}
        {pauseReason && entry.action_type === 'paused' && (
          <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded text-sm text-yellow-700 dark:text-yellow-300">
            <span className="font-medium">Motivo de pausa:</span> {pauseReason}
          </div>
        )}

        {/* Tiempo total pausado - solo mostrar en resumed/completed cuando hay tiempo real (no 00:00:00) */}
        {totalPausedTime && totalPausedTime !== '00:00:00' && entry.action_type !== 'paused' && (
          <p className="text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Tiempo total pausado: {totalPausedTime}
          </p>
        )}

        {/* Fecha programada */}
        {scheduledDate && entry.action_type === 'scheduled' && (
          <p className="text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3 inline mr-1" />
            Fecha: {scheduledDate}
          </p>
        )}

        {/* Kilometraje al ingresar */}
        {kilometerAtEntry && (
          <p className="text-xs text-muted-foreground mt-1">
            <Truck className="h-3 w-3 inline mr-1" />
            Kilometraje: {kilometerAtEntry} km
          </p>
        )}

        {/* Horómetro al ingresar */}
        {engineHoursAtEntry != null && (
          <p className="text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Horómetro: {engineHoursAtEntry} hs
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(entry.performed_at)}</p>
      </div>
    </div>
  );
}

// Helper para formatear número de orden: OT-AC976XW-SECTORDELTAL-000001 → OT-AC976XW-000001
function formatOrderNumber(orderNumber: string): string {
  const parts = orderNumber.split('-');
  if (parts.length >= 4) {
    // OT-DOMINIO-SECTOR-NUMERO → OT-DOMINIO-NUMERO
    return `${parts[0]}-${parts[1]}-${parts[parts.length - 1]}`;
  }
  return orderNumber;
}

// Componente para mostrar OTs hermanas (más compacto)
function SiblingWorkOrders({ siblings }: { siblings: { id: string; order_number: string; status: string }[] }) {
  if (siblings.length === 0) return null;

  return (
    <div className="mb-3 p-2 bg-muted/50 rounded-md">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          Otras OTs:
        </span>
        {siblings.map((wo) => (
          <Badge key={wo.id} variant="secondary" className="text-xs font-normal">
            {formatOrderNumber(wo.order_number)}
            <span className="ml-1 text-muted-foreground">• {getStatusLabel(wo.status)}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

// Componente para mostrar el origen de la solicitud (Paso 1)
function OriginItem({ origin, hasMoreItems }: { origin: MaintenanceRequestOrigin; hasMoreItems: boolean }) {
  const isChecklist = origin.type === 'checklist';

  return (
    <div className="relative flex items-start gap-3 pl-1">
      {/* Línea conectora */}
      {hasMoreItems && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}

      {/* Icono del timeline */}
      <div
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
          isChecklist ? 'bg-blue-50 border-blue-600' : 'bg-orange-50 border-orange-600'
        }`}
      >
        {isChecklist ? (
          <ClipboardCheck className="h-4 w-4 text-blue-600" />
        ) : (
          <FileText className="h-4 w-4 text-orange-600" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 pt-0.5 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {isChecklist ? 'Origen: Inspección de Checklist' : 'Origen: Pedido Manual'}
          </span>
          <Badge variant={isChecklist ? 'default' : 'secondary'} className="text-xs">
            {isChecklist ? 'Checklist' : 'Manual'}
          </Badge>
        </div>

        {isChecklist && origin.checklist ? (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm space-y-1">
            {origin.checklist.chofer && (
              <p className="flex items-center gap-1 text-blue-800 dark:text-blue-200">
                <User className="h-3 w-3" />
                <span className="font-medium">Chofer:</span> {origin.checklist.chofer}
              </p>
            )}
            {origin.checklist.fecha && (
              <p className="flex items-center gap-1 text-blue-800 dark:text-blue-200">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">Fecha inspección:</span> {origin.checklist.fecha}
                {origin.checklist.hora && ` a las ${origin.checklist.hora}`}
              </p>
            )}
            {origin.checklist.kilometraje && (
              <p className="flex items-center gap-1 text-blue-800 dark:text-blue-200">
                <Truck className="h-3 w-3" />
                <span className="font-medium">Kilometraje:</span> {origin.checklist.kilometraje} km
              </p>
            )}
            {origin.checklist.respondedBy?.fullname && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Registrado por: {origin.checklist.respondedBy.fullname}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-md text-sm">
            <p className="text-orange-800 dark:text-orange-200">
              Solicitud creada directamente desde el módulo de mantenimiento
            </p>
            {origin.manualCreator?.fullname && (
              <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                Creado por: {origin.manualCreator.fullname}
              </p>
            )}
          </div>
        )}

        {/* Timestamp del origen */}
        {origin.createdAt && <p className="text-xs text-muted-foreground mt-2">{formatDateTime(origin.createdAt)}</p>}
      </div>
    </div>
  );
}

export function ActivityHistoryModal({
  open,
  onClose,
  maintenanceOrderId,
  maintenanceRequestId,
  workOrderId,
  title = 'Historial de Actividades',
}: ActivityHistoryModalProps) {
  // Determinar el tipo de vista
  const isWorkOrderView = !!workOrderId;
  const isOrderView = !workOrderId && !!maintenanceOrderId;
  const isRequestOnlyView = !workOrderId && !maintenanceOrderId && !!maintenanceRequestId;

  // Query para historial completo de Work Order (incluye solicitud)
  const { data: fullWorkOrderLog, isLoading: isLoadingFullWO } = useQuery({
    queryKey: ['work-order-full-activity-log', workOrderId],
    queryFn: () => getWorkOrderFullActivityLog(workOrderId!),
    enabled: open && isWorkOrderView,
  });

  // Query para historial completo de maintenance_order (incluye origen desde request)
  const { data: fullOrderLog, isLoading: isLoadingFullOrder } = useQuery({
    queryKey: ['maintenance-order-full-activity-log', maintenanceOrderId, maintenanceRequestId],
    queryFn: () => getMaintenanceOrderFullActivityLog(maintenanceOrderId!, maintenanceRequestId || undefined),
    enabled: open && isOrderView,
  });

  // Query para historial completo de maintenance_request SOLO (sin order asociado)
  const { data: fullRequestLog, isLoading: isLoadingFullRequest } = useQuery({
    queryKey: ['maintenance-request-full-activity-log', maintenanceRequestId],
    queryFn: () => getMaintenanceRequestFullActivityLog(maintenanceRequestId!),
    enabled: open && isRequestOnlyView,
  });

  const isLoading = isLoadingFullWO || isLoadingFullOrder || isLoadingFullRequest;

  // Obtener el log de actividades según el tipo de vista
  let activityLog: Awaited<ReturnType<typeof getMaintenanceOrderActivityLog>> = [];
  if (isWorkOrderView) {
    activityLog = fullWorkOrderLog?.history || [];
  } else if (isOrderView) {
    activityLog = fullOrderLog?.history || [];
  } else if (isRequestOnlyView) {
    activityLog = fullRequestLog?.history || [];
  }

  // Obtener el origen (para Order view y Request only view)
  const requestOrigin = isOrderView ? fullOrderLog?.origin : isRequestOnlyView ? fullRequestLog?.origin : null;

  const siblingWorkOrders = isWorkOrderView ? fullWorkOrderLog?.siblingWorkOrders : [];
  const vehicleInfo = isWorkOrderView ? fullWorkOrderLog?.vehicleInfo : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isWorkOrderView ? (
              <span className="flex items-center gap-2">
                Historial completo desde la solicitud hasta la orden de trabajo
                {vehicleInfo && (
                  <Badge variant="outline">
                    <Truck className="h-3 w-3 mr-1" />
                    {vehicleInfo.domain || vehicleInfo.intern_number}
                  </Badge>
                )}
              </span>
            ) : (
              'Registro de todas las acciones realizadas'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (activityLog && activityLog.length > 0) || requestOrigin ? (
            <div>
              {/* Mostrar OTs hermanas si es vista de work order */}
              {isWorkOrderView && siblingWorkOrders && siblingWorkOrders.length > 0 && (
                <SiblingWorkOrders siblings={siblingWorkOrders} />
              )}

              {/* Timeline */}
              <div className="relative">
                {/* Mostrar origen como primer item (para vista de pedido o solicitud) */}
                {requestOrigin && <OriginItem origin={requestOrigin} hasMoreItems={activityLog.length > 0} />}

                {activityLog.map((entry, index) => (
                  <TimelineItem
                    key={entry.id}
                    entry={entry as Parameters<typeof TimelineItem>[0]['entry']}
                    isLast={index === activityLog.length - 1}
                    showSource={isWorkOrderView}
                  />
                ))}
              </div>

              {/* Separador y leyenda si es vista de work order */}
              {isWorkOrderView && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        Pedido
                      </Badge>
                      = Solicitud original
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant="default" className="text-xs">
                        OT
                      </Badge>
                      = Orden de trabajo
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sin historial registrado</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
