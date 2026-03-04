'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import type { MaintenanceRequestData } from '../actions/actionsServer';

interface SolicitudDetailDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

// Función para formatear el código de sección (sistema_electrico -> Sistema Electrico)
const formatSectionCode = (code: string | null | undefined): string => {
  if (!code) return '-';
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function SolicitudDetailDialog({ request, open, onClose }: SolicitudDetailDialogProps) {
  const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
    pending_approval: { label: 'Pendiente de Aprobación', variant: 'warning' },
    approved: { label: 'Aprobada', variant: 'success' },
    rejected: { label: 'Rechazada', variant: 'destructive' },
  };

  const itemStatusConfig: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
    pending: { label: 'Pendiente', variant: 'secondary' },
    approved: { label: 'Aprobado', variant: 'success' },
    rejected: { label: 'Rechazado', variant: 'destructive' },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Solicitud de Mantenimiento</DialogTitle>
          <DialogDescription>Solicitud creada el {formatDateTime(request.created_at)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información general */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Equipo:</span>
                  <p className="font-medium">
                    {request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar'}
                    {request.vehicles?.intern_number && ` (#${request.vehicles.intern_number})`}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <div className="mt-1">
                    <Badge variant={statusConfig[request.status]?.variant || 'secondary'}>
                      {statusConfig[request.status]?.label || request.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Chofer:</span>
                  <p className="font-medium">
                    {(request.checklist_answers?.answer_data as { chofer?: string } | null)?.chofer ||
                      (request.employees
                        ? `${request.employees.firstname} ${request.employees.lastname}`
                        : 'No especificado')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Creado por:</span>
                  <p className="font-medium">{request.profile_user?.fullname || 'No especificado'}</p>
                </div>
                {request.kilometer && (
                  <div>
                    <span className="text-sm text-muted-foreground">Kilometraje:</span>
                    <p className="font-medium">{request.kilometer} km</p>
                  </div>
                )}
                {request.engine_hours && (
                  <div>
                    <span className="text-sm text-muted-foreground">Horómetro:</span>
                    <p className="font-medium">{request.engine_hours} hs</p>
                  </div>
                )}
              </div>

              {request.status === 'rejected' && request.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                  <span className="text-sm font-medium text-red-800">Motivo de rechazo:</span>
                  <p className="text-sm text-red-700">{request.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Items (desvíos) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Desvíos ({request.maintenance_request_items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {request.maintenance_request_items?.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.checklist_deviations?.item_label || 'Sin título'}</p>
                        <p className="text-sm text-muted-foreground">
                          Sección: {formatSectionCode(item.checklist_deviations?.section_code)}
                        </p>
                      </div>
                      <Badge variant={itemStatusConfig[item.status]?.variant || 'secondary'}>
                        {itemStatusConfig[item.status]?.label || item.status}
                      </Badge>
                    </div>

                    {(item.driver_comment || item.checklist_deviations?.driver_comment) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Comentario del chofer: </span>
                        <span className="italic">
                          {item.driver_comment || item.checklist_deviations?.driver_comment}
                        </span>
                      </div>
                    )}

                    {item.validator_comment && (
                      <div className="text-sm p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                        <span className="text-blue-800 dark:text-blue-200 font-medium">Comentario del validador: </span>
                        <span className="text-blue-700 dark:text-blue-300">{item.validator_comment}</span>
                      </div>
                    )}

                    {item.types_of_repairs && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tipo de reparación: </span>
                        <Badge variant="secondary">{item.types_of_repairs.name}</Badge>
                      </div>
                    )}

                    {item.description && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Descripción: </span>
                        <span>{item.description}</span>
                      </div>
                    )}

                    {item.status === 'rejected' && item.rejection_reason && (
                      <div className="text-sm p-2 bg-red-50 rounded">
                        <span className="text-red-800 font-medium">Motivo: </span>
                        <span className="text-red-700">{item.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                ))}

                {(!request.maintenance_request_items || request.maintenance_request_items.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No hay desvíos registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
