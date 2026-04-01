'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  dailyReportRowStatusBadges,
  dailyReportRowStatusLabels,
  dailyReportTypeServiceLabels,
} from '@/shared/utils/mappers';
import moment from 'moment';
import type { DailyReportDetailRow } from '../types';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: DailyReportDetailRow | null;
}

// ============================================================================
// HELPER SUBCOMPONENTS
// ============================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function EmptyValue() {
  return <span className="text-muted-foreground">—</span>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ServiceDetailDialog({ open, onOpenChange, row }: Props) {
  if (!row) return null;

  const statusLabel = row.status ? dailyReportRowStatusLabels[row.status] ?? row.status : null;
  const statusVariant = row.status ? dailyReportRowStatusBadges[row.status] ?? 'default' : 'default';

  const typeServiceLabel = row.type_service ? dailyReportTypeServiceLabels[row.type_service] ?? row.type_service : null;

  const employees = row.dailyreportemployeerelations ?? [];
  const equipmentRelations = row.dailyreportequipmentrelations ?? [];
  const customerEquipmentRelations = row.dailyreport_customer_equipment_relations ?? [];

  const formatTime = (val: Date | string | null | undefined) => {
    if (!val) return null;
    return moment(val).format('HH:mm');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del Servicio</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cliente">{row.customers?.name ?? <EmptyValue />}</Field>
            <Field label="Servicio">{row.customer_services?.service_name ?? <EmptyValue />}</Field>
            <Field label="Ítem">{row.service_items?.item_name ?? <EmptyValue />}</Field>
            <Field label="Sector">{row.service_sectors?.sectors?.name ?? <EmptyValue />}</Field>
            <Field label="Área">{row.service_areas?.areas_cliente?.descripcion_corta ?? <EmptyValue />}</Field>
          </div>

          <Separator />

          {/* Detalles de jornada y estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jornada">{row.working_day ?? <EmptyValue />}</Field>
            <Field label="Horario inicio">{formatTime(row.start_time) ?? <EmptyValue />}</Field>
            <Field label="Horario fin">{formatTime(row.end_time) ?? <EmptyValue />}</Field>
            <Field label="Estado">
              {statusLabel ? (
                <Badge variant={statusVariant as Parameters<typeof Badge>[0]['variant']}>{statusLabel}</Badge>
              ) : (
                <EmptyValue />
              )}
            </Field>
            <Field label="Tipo servicio">
              {typeServiceLabel ? <Badge variant="outline">{typeServiceLabel}</Badge> : <EmptyValue />}
            </Field>
          </div>

          {/* Descripción */}
          {row.description && (
            <>
              <Separator />
              <Field label="Descripción">
                <p className="text-sm whitespace-pre-wrap">{row.description}</p>
              </Field>
            </>
          )}

          <Separator />

          {/* Recursos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Empleados */}
            <Field label="Empleados">
              {employees.length === 0 ? (
                <EmptyValue />
              ) : (
                <div className="flex flex-col gap-1">
                  {employees.map((rel) => {
                    const emp = rel.employees;
                    if (!emp) return null;
                    const label = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
                    return (
                      <Badge key={rel.id} variant="outline" className="w-fit text-xs font-normal">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Equipos propios (vehículos + otros equipos) */}
            <Field label="Equipos">
              {equipmentRelations.length === 0 ? (
                <EmptyValue />
              ) : (
                <div className="flex flex-col gap-1">
                  {equipmentRelations.map((rel) => {
                    let label = '—';
                    if (rel.vehicles) {
                      label = rel.vehicles.domain ?? rel.vehicles.intern_number ?? 'Vehículo';
                    } else if (rel.other_equipment) {
                      label = rel.other_equipment.intern_number ?? rel.other_equipment.serial_number ?? 'Equipo';
                    }
                    return (
                      <Badge key={rel.id} variant="secondary" className="w-fit text-xs font-normal">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Equipos de cliente */}
            <Field label="Equipos cliente">
              {customerEquipmentRelations.length === 0 ? (
                <EmptyValue />
              ) : (
                <div className="flex flex-col gap-1">
                  {customerEquipmentRelations.map((rel) => {
                    const eq = rel.equipos_clientes;
                    const label = eq?.name ?? eq?.type ?? 'Equipo cliente';
                    return (
                      <Badge key={rel.id} variant="outline" className="w-fit text-xs font-normal">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Nro Remito */}
            <Field label="Nro Remito">{row.remit_number ?? <EmptyValue />}</Field>
          </div>

          <Separator />

          {/* Turnos completados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Completado Día">
              {row.completed_day == null ? (
                <EmptyValue />
              ) : (
                <Badge variant={row.completed_day ? 'success' : 'secondary'}>
                  {row.completed_day ? 'Completado' : 'No completado'}
                </Badge>
              )}
            </Field>
            <Field label="Completado Noche">
              {row.completed_night == null ? (
                <EmptyValue />
              ) : (
                <Badge variant={row.completed_night ? 'success' : 'secondary'}>
                  {row.completed_night ? 'Completado' : 'No completado'}
                </Badge>
              )}
            </Field>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
