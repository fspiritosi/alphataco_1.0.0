'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import moment from 'moment';
import type { MaintenanceRequestData } from '../actions/actionsServer';

interface SolicitudDetailDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

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
          <DialogDescription>
            Solicitud creada el {moment(request.created_at).format('DD/MM/YYYY HH:mm')}
          </DialogDescription>
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
                  <span className="text-sm text-muted-foreground">Creado por:</span>
                  <p className="font-medium">
                    {request.employees
                      ? `${request.employees.firstname} ${request.employees.lastname}`
                      : 'No especificado'}
                  </p>
                </div>
                {request.kilometer && (
                  <div>
                    <span className="text-sm text-muted-foreground">Kilometraje:</span>
                    <p className="font-medium">{request.kilometer} km</p>
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
                          Sección: {item.checklist_deviations?.section_code || '-'}
                        </p>
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
