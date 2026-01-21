'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import moment from 'moment';
import type { MaintenanceOrderInWorkshopData } from '../../actions/actionsServer';

interface PlanificacionDetailDialogProps {
  order: MaintenanceOrderInWorkshopData;
  open: boolean;
  onClose: () => void;
}

export function PlanificacionDetailDialog({ order, open, onClose }: PlanificacionDetailDialogProps) {
  const vehicle = order.vehicles;
  const items = order.maintenance_order_items || [];

  // Función para formatear el código de sección (sistema_electrico -> Sistema Electrico)
  const formatSectionCode = (code: string | null | undefined): string => {
    if (!code) return '-';
    return code
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de Equipo en Planificación</DialogTitle>
          <DialogDescription>
            {vehicle?.domain || vehicle?.serie || 'Equipo sin identificar'}
            {vehicle?.intern_number && ` - #${vehicle.intern_number}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Info del equipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Dominio</span>
                <p className="font-medium">{vehicle?.domain || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Serie</span>
                <p className="font-medium">{vehicle?.serie || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">N° Interno</span>
                <p className="font-medium">{vehicle?.intern_number || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Tipo</span>
                <p className="font-medium">{vehicle?.vehicle_type?.name || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Condición</span>
                <div>
                  <Badge variant={vehicle?.condition === 'operativo' ? 'success' : 'destructive'}>
                    {vehicle?.condition || 'Desconocido'}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Km al Ingreso</span>
                <p className="font-medium">
                  {order.maintenance_requests?.kilometer
                    ? `${order.maintenance_requests.kilometer.toLocaleString()} km`
                    : '-'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Info del pedido */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Fecha Entrada Taller</span>
                <p className="font-medium">
                  {order.workshop_entry_date ? moment(order.workshop_entry_date).format('DD/MM/YYYY HH:mm') : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Estado</span>
                <div>
                  <Badge variant="secondary">En Taller</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items/Desvíos */}
            <div>
              <h4 className="font-semibold mb-2">Desvíos a Planificar ({items.length})</h4>
              <div className="space-y-2">
                {items.map((item, index) => {
                  const deviation = item.maintenance_request_items?.checklist_deviations;
                  const repairType = item.types_of_repairs;

                  return (
                    <div key={item.id || index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{deviation?.item_label || 'Desvío sin descripción'}</p>
                          {deviation?.section_code && (
                            <p className="text-xs text-muted-foreground">
                              Sección: {formatSectionCode(deviation.section_code)}
                            </p>
                          )}
                          {repairType && (
                            <Badge variant="outline" className="mt-1">
                              {repairType.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          {/* TODO: Agregar workshop_id a maintenance_order_items */}
                          {(item as typeof item & { workshop_id?: string }).workshop_id ? (
                            <Badge variant="success" className="text-xs">
                              Taller asignado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Sin asignar
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-muted-foreground text-sm">No hay desvíos registrados</p>}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
