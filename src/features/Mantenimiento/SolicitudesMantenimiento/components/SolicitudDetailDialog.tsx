'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PREVENTIVE_TYPES, type PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
import { formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { resolveDriverInfo } from '@/features/Mantenimiento/utils/driverInfo';
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
                  {(() => {
                    const driver = resolveDriverInfo(request);
                    return (
                      <div className="flex items-center gap-2">
                        {driver.fileNumber && (
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{driver.fileNumber}</span>
                        )}
                        <p className="font-medium">{driver.name}</p>
                      </div>
                    );
                  })()}
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

          {/* Tipo de mantenimiento (solo preventivo) */}
          {request.source === 'preventive' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tipo de Mantenimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Mantenimiento Preventivo</h4>
                  <Badge variant="secondary">
                    {PREVENTIVE_TYPES[request.preventive_type as PreventiveType] ??
                      request.preventive_type ??
                      'Preventivo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items (desvíos / necesidades) — siempre que existan */}
          {request.maintenance_request_items && request.maintenance_request_items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {request.source === 'preventive' ? 'Necesidades' : 'Desvíos'} (
                  {request.maintenance_request_items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.maintenance_request_items.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{item.checklist_deviations?.item_label || 'Sin título'}</p>
                          {item.checklist_deviations?.section_code && (
                            <p className="text-sm text-muted-foreground">
                              Sección: {formatSectionCode(item.checklist_deviations.section_code)}
                            </p>
                          )}
                        </div>
                        <Badge variant={itemStatusConfig[item.status]?.variant || 'secondary'}>
                          {itemStatusConfig[item.status]?.label || item.status}
                        </Badge>
                      </div>

                      {item.types_of_repairs && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Tipo de reparación: </span>
                          <Badge variant="secondary">{item.types_of_repairs.name}</Badge>
                        </div>
                      )}

                      <ItemComments
                        item={{ maintenance_request_items: item }}
                        source={request.source}
                        fallbackAuthorName={request.profile_maintenance_requests_supervisor_idToprofile?.fullname}
                      />

                      {item.status === 'rejected' && item.rejection_reason && (
                        <div className="text-sm p-2 bg-red-50 rounded">
                          <span className="text-red-800 font-medium">Motivo: </span>
                          <span className="text-red-700">{item.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
