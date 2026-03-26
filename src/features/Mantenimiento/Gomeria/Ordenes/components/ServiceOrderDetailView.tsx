'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TireDiagramRenderer,
  type DiagramAxle,
  type DiagramPosition,
} from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import {
  tireOldDestinationLabels,
  tireServiceActionBadges,
  tireServiceActionLabels,
  tireServiceOrderStatusBadges,
  tireServiceOrderStatusLabels,
} from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { getServiceOrderById, getVehicleTirePositions } from '../actions/actions.server';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ServiceOrderDetailViewProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ServiceOrderDetailView({ orderId, open, onOpenChange }: ServiceOrderDetailViewProps) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['service-order-detail', orderId],
    queryFn: () => getServiceOrderById(orderId),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const { data: vehiclePositions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['vehicle-tire-positions', order?.vehicle_id],
    queryFn: () => getVehicleTirePositions(order!.vehicle_id),
    enabled: !!order?.vehicle_id && open,
    staleTime: 30 * 1000,
  });

  const { data: trailerPositions } = useQuery({
    queryKey: ['vehicle-tire-positions', order?.trailer_vehicle_id],
    queryFn: () => getVehicleTirePositions(order!.trailer_vehicle_id!),
    enabled: !!order?.trailer_vehicle_id && open,
    staleTime: 30 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Orden de Gomería</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !order ? (
          <p className="text-muted-foreground text-sm">Orden no encontrada.</p>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <InfoItem label="Vehículo" value={order.vehicle?.domain ?? '-'} />
              <InfoItem label="Enganche" value={order.trailer?.domain ?? 'Sin enganche'} />
              <InfoItem label="Kilómetros" value={order.kilometer ?? '-'} />
              <InfoItem label="Fecha" value={moment(order.service_date).format('DD/MM/YYYY')} />
              <InfoItem label="Creado por" value={order.creator?.fullname ?? '-'} />
              <InfoItem
                label="Estado"
                value={
                  <Badge variant={tireServiceOrderStatusBadges[order.status] ?? 'default'}>
                    {tireServiceOrderStatusLabels[order.status] ?? order.status}
                  </Badge>
                }
              />
              {order.closed_at && (
                <InfoItem label="Cerrado" value={moment(order.closed_at).format('DD/MM/YYYY HH:mm')} />
              )}
            </div>

            {/* Interventions table */}
            {order.items && order.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Intervenciones ({order.items.length})
                </p>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Pos.</TableHead>
                        <TableHead className="text-xs">Acción</TableHead>
                        <TableHead className="text-xs">Cubierta</TableHead>
                        <TableHead className="text-xs">Nueva cubierta</TableHead>
                        <TableHead className="text-xs">Destino ant.</TableHead>
                        <TableHead className="text-xs">Desgaste</TableHead>
                        <TableHead className="text-xs">Presiones</TableHead>
                        <TableHead className="text-xs">Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-mono">{item.position_number}</TableCell>
                          <TableCell>
                            <Badge variant={tireServiceActionBadges[item.action] ?? 'default'} className="text-[10px]">
                              {tireServiceActionLabels[item.action] ?? item.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{item.tire?.serial_number ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono">{item.new_tire?.serial_number ?? '-'}</TableCell>
                          <TableCell className="text-xs">
                            {item.old_tire_destination
                              ? tireOldDestinationLabels[item.old_tire_destination] ?? item.old_tire_destination
                              : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.tread_depth != null ? `${Number(item.tread_depth).toFixed(0)} %` : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.pressure_start != null || item.pressure_end != null
                              ? `${item.pressure_start ?? '?'} → ${item.pressure_end ?? '?'} PSI`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{item.observations ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Vehicle diagram — below interventions */}
            {isLoadingPositions ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : vehiclePositions && vehiclePositions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Diagrama — {order.vehicle?.domain}
                </p>
                <VehicleDiagramReadonly positions={vehiclePositions} label={order.vehicle?.domain} />
              </div>
            ) : null}

            {/* Trailer diagram */}
            {order.trailer_vehicle_id && trailerPositions && trailerPositions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-dashed" />
                  <p className="text-xs text-muted-foreground whitespace-nowrap">Enganche: {order.trailer?.domain}</p>
                  <div className="flex-1 border-t border-dashed" />
                </div>
                <VehicleDiagramReadonly positions={trailerPositions} label={order.trailer?.domain} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

type PositionWithAxle = Awaited<ReturnType<typeof getVehicleTirePositions>>[number];

function VehicleDiagramReadonly({ positions, label }: { positions: PositionWithAxle[]; label?: string | null }) {
  const axleMap = new Map<string, DiagramAxle>();
  for (const pos of positions) {
    if (!pos.template_axle) continue;
    const key = pos.template_axle.id;
    if (!axleMap.has(key)) {
      axleMap.set(key, {
        id: pos.template_axle.id,
        axle_number: pos.template_axle.axle_number,
        tires_per_side: pos.template_axle.tires_per_side,
        tire_size: pos.template_axle.tire_size,
        is_drive_axle: pos.template_axle.is_drive_axle,
        is_spare: pos.template_axle.is_spare,
      });
    }
  }
  const axles: DiagramAxle[] = Array.from(axleMap.values());

  const diagramPositions: DiagramPosition[] = positions.map((p) => ({
    position_number: p.position_number,
    axle_number: p.axle_number,
    side: p.side as 'LEFT' | 'RIGHT' | 'SPARE',
    tire_id: p.tire_id,
    tire_serial: p.tire?.serial_number,
    tire_brand: p.tire?.brand?.name,
    tire_size: p.tire?.size,
  }));

  return (
    <TireDiagramRenderer axles={axles} positions={diagramPositions} interactive={false} label={label ?? undefined} />
  );
}
