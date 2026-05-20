'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PREVENTIVE_TYPES, type PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
import { formatDateOnly } from '@/features/Mantenimiento/utils/dateFormat';
import type { MaintenanceOperationData } from '../actions/actionsServer';

interface OperacionDetailDialogProps {
  operation: MaintenanceOperationData;
  open: boolean;
  onClose: () => void;
}

export function OperacionDetailDialog({ operation, open, onClose }: OperacionDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Operación</DialogTitle>
          <DialogDescription>
            Operación planificada para el {formatDateOnly(operation.scheduled_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del equipo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Información del Equipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Equipo:</span>
                  <p className="font-medium">
                    {operation.vehicles?.domain || operation.vehicles?.serie || 'Sin identificar'}
                    {operation.vehicles?.intern_number && ` (#${operation.vehicles.intern_number})`}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Condición actual:</span>
                  <div className="mt-1">
                    <Badge variant={operation.vehicles?.condition === 'operativo' ? 'success' : 'destructive'}>
                      {operation.vehicles?.condition || 'Desconocido'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Kilometraje actual:</span>
                  <p className="font-medium">{operation.vehicles?.kilometer || '-'} km</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Horómetro actual:</span>
                  <p className="font-medium">{operation.vehicles?.engine_hours || '-'} hs</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Fecha planificada:</span>
                  <p className="font-medium">{formatDateOnly(operation.scheduled_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Tipo de mantenimiento (solo preventivo) */}
          {operation.maintenance_requests?.source === 'preventive' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tipo de Mantenimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Mantenimiento Preventivo</h4>
                  <Badge variant="secondary">
                    {PREVENTIVE_TYPES[operation.maintenance_requests?.preventive_type as PreventiveType] ??
                      operation.maintenance_requests?.preventive_type ??
                      'Preventivo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items / Necesidades — siempre que existan */}
          {operation.maintenance_order_items && operation.maintenance_order_items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {operation.maintenance_requests?.source === 'preventive' ? 'Necesidades' : 'Items a Reparar'} (
                  {operation.maintenance_order_items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {operation.maintenance_order_items.map((item) => {
                    // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
                    const pivotRepairTypes = (item as any).maintenance_order_item_repair_types || [];
                    const repairTypeNames: string[] =
                      pivotRepairTypes.length > 0
                        ? pivotRepairTypes.map((rt: any) => rt.types_of_repairs?.name).filter(Boolean)
                        : item.types_of_repairs?.name
                          ? [item.types_of_repairs.name]
                          : [];

                    const itemLabel = item.maintenance_request_items?.checklist_deviations?.item_label;
                    const sectionCode = item.maintenance_request_items?.checklist_deviations?.section_code;

                    return (
                      <div key={item.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{itemLabel || 'Sin título'}</p>
                            {sectionCode && (
                              <p className="text-sm text-muted-foreground">Sección: {sectionCode}</p>
                            )}
                            <ItemComments
                              item={item}
                              source={operation.maintenance_requests?.source}
                              fallbackAuthorName={
                                operation.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile
                                  ?.fullname
                              }
                            />
                          </div>
                          {repairTypeNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                              {repairTypeNames.map((name, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
