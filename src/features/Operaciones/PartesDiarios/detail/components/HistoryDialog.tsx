'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Computer,
  ExternalLink,
  History,
  Info,
  LinkIcon,
  PlusCircle,
  RotateCcw,
  UserCircle,
  Wrench,
  X,
} from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { getDailyReportRowHistory } from '../actions.server';
import type { DailyReportHistoryEntry } from '../types';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('HistoryDialog');

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

type ActionType = string;

function getActionIcon(actionType: ActionType) {
  switch (actionType) {
    case 'UPDATE':
      return <RotateCcw className="h-5 w-5" />;
    case 'LINK':
      return <LinkIcon className="h-5 w-5" />;
    case 'CREATE':
      return <PlusCircle className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
}

function getActionColor(actionType: ActionType) {
  switch (actionType) {
    case 'UPDATE':
      return 'bg-blue-600 text-white';
    case 'LINK':
      return 'bg-purple-600 text-white';
    case 'UNLINK':
      return 'bg-orange-600 text-white';
    case 'CREATE':
      return 'bg-emerald-600 text-white';
    case 'DELETE':
      return 'bg-red-600 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
}

function getActionName(actionType: ActionType) {
  switch (actionType) {
    case 'UPDATE':
      return 'Actualización';
    case 'LINK':
      return 'Vinculación';
    case 'UNLINK':
      return 'Desvinculación';
    case 'CREATE':
      return 'Creación';
    case 'DELETE':
      return 'Eliminación';
    default:
      return actionType;
  }
}

const fieldTranslations: Record<string, string> = {
  completed_night: 'Completado Nocturno',
  completed_day: 'Completado Diurno',
  status: 'Estado',
  description: 'Descripción',
  start_time: 'Hora de Inicio',
  end_time: 'Hora de Fin',
  service_type: 'Tipo de Servicio',
  working_day: 'Jornada Laboral',
  customer: 'Cliente',
  service: 'Servicio',
  item: 'Ítem',
  sin_recursos_asignados: 'Sin Recursos Asignados',
};

function getFieldDisplayName(fieldName: string, field: string) {
  return fieldTranslations[field] || fieldName || field;
}

function getValueDisplay(value: unknown, field: string): string {
  if (value === null || value === undefined) return 'Sin valor';
  switch (field) {
    case 'completed_night':
    case 'completed_day':
      return value === true ? 'Completado' : value === false ? 'No completado' : String(value);
    default:
      return String(value).replaceAll('_', ' ');
  }
}

// ============================================================================
// SKELETON
// ============================================================================

function HistoryDialogSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ENTRY ITEM
// ============================================================================

function HistoryEntryItem({ entry, isLast }: { entry: DailyReportHistoryEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);

  // Parse changed_data as an object or array if it's JSON
  type ChangesShape = {
    type?: string;
    fieldName?: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    data?: Record<string, unknown>;
    vehicle?: { id?: string; domain?: string; internNumber?: string };
    employee?: { id?: string; name?: string };
    otherEquipment?: {
      typeName?: string;
      internNumber?: string;
      serialNumber?: string;
    };
  };

  let changes: ChangesShape[] = [];
  try {
    if (entry.changed_data) {
      const parsed = JSON.parse(JSON.stringify(entry.changed_data));
      changes = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch (e) {
    logger.warn('Error al parsear changed_data del historial', { data: { e } });
  }

  const actionType = entry.action_type ?? 'UNKNOWN';

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-[22px] top-12 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
      )}

      <div className="flex gap-4">
        {/* Timeline node */}
        <div
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center shrink-0 z-10',
            getActionColor(actionType)
          )}
        >
          {getActionIcon(actionType)}
        </div>

        <div className="flex-1 pb-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">{getActionName(actionType)}</h3>
              <Badge variant="outline" className="font-normal text-xs">
                {actionType === 'UPDATE' && `${changes.length} cambio${changes.length !== 1 ? 's' : ''}`}
                {(actionType === 'LINK' || actionType === 'UNLINK') &&
                  changes[0]?.type === 'vehicle_relation' &&
                  'Vehículo'}
                {(actionType === 'LINK' || actionType === 'UNLINK') &&
                  changes[0]?.type === 'employee_relation' &&
                  'Empleado'}
                {(actionType === 'LINK' || actionType === 'UNLINK') &&
                  changes[0]?.type === 'other_equipment_relation' &&
                  'Otro Equipo'}
                {actionType === 'CREATE' && 'Nuevo registro'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {moment(entry.created_at).format('DD MMM YYYY, HH:mm')}
              </span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">
                      {entry.users ? (
                        <>
                          <UserCircle className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                          <span className="text-slate-700 dark:text-slate-300">{entry.users.email ?? 'Usuario'}</span>
                          {entry.users.id && (
                            <a
                              href="/dashboard/company/actualCompany?tab=general&subtab=users"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex ml-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3 text-slate-500 hover:text-blue-500" />
                            </a>
                          )}
                        </>
                      ) : (
                        <>
                          <Computer className="h-3.5 w-3.5 text-orange-600" />
                          <span className="text-slate-700 dark:text-slate-300">El Sistema</span>
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {entry.users ? <p>{entry.users.email}</p> : <p>Cambio realizado automáticamente</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between mb-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            onClick={() => setExpanded((p) => !p)}
          >
            <span className="font-medium text-sm">{expanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Expandable content */}
          {expanded && (
            <div className="space-y-3">
              {/* CREATE: full record */}
              {actionType === 'CREATE' && changes[0]?.type === 'full_record' && (
                <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
                  <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                    Detalles del registro creado:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries((changes[0].data as Record<string, unknown>) ?? {}).map(([key, value]) => (
                      <div key={key} className="bg-white dark:bg-slate-900 p-3 rounded-md border">
                        <span className="text-xs text-muted-foreground block mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-200 text-sm">
                          {String(value ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LINK/UNLINK: vehicle */}
              {(actionType === 'LINK' || actionType === 'UNLINK') && changes[0]?.type === 'vehicle_relation' && (
                <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
                  <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                    {actionType === 'LINK' ? 'Vehículo vinculado:' : 'Vehículo desvinculado:'}
                  </h4>
                  {entry.reassignment_reason && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 p-2 rounded-md">
                      <p className="text-sm text-amber-800 flex items-start gap-1">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Motivo:</strong> {entry.reassignment_reason}
                        </span>
                      </p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-md border flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Dominio:</span>
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                        {changes[0].vehicle?.domain ?? '—'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Número interno:</span>
                      <span className="font-medium text-sm">{changes[0].vehicle?.internNumber ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* LINK/UNLINK: other equipment */}
              {(actionType === 'LINK' || actionType === 'UNLINK') &&
                changes[0]?.type === 'other_equipment_relation' && (
                  <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
                    <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                      {actionType === 'LINK' ? 'Otro equipo vinculado:' : 'Otro equipo desvinculado:'}
                    </h4>
                    {entry.reassignment_reason && (
                      <div className="mb-3 bg-amber-50 border border-amber-200 p-2 rounded-md">
                        <p className="text-sm text-amber-800 flex items-start gap-1">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Motivo:</strong> {entry.reassignment_reason}
                          </span>
                        </p>
                      </div>
                    )}
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-md border flex flex-col gap-2">
                      {changes[0].otherEquipment?.typeName && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Tipo:</span>
                          <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                            <Wrench className="h-3 w-3 mr-1" />
                            {changes[0].otherEquipment.typeName}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Número interno:</span>
                        <span className="font-medium text-sm">{changes[0].otherEquipment?.internNumber ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

              {/* LINK/UNLINK: employee */}
              {(actionType === 'LINK' || actionType === 'UNLINK') && changes[0]?.type === 'employee_relation' && (
                <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
                  <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                    {actionType === 'LINK' ? 'Empleado vinculado:' : 'Empleado desvinculado:'}
                  </h4>
                  {entry.reassignment_reason && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 p-2 rounded-md">
                      <p className="text-sm text-amber-800 flex items-start gap-1">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Motivo:</strong> {entry.reassignment_reason}
                        </span>
                      </p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-md border">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Nombre:</span>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        {changes[0].employee?.name ?? '—'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* UPDATE: field changes */}
              {actionType === 'UPDATE' && (
                <div className="space-y-3">
                  {changes.map((change, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
                      <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                        {getFieldDisplayName(change.fieldName ?? '', change.field ?? '')}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-md border relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
                          <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <X className="h-3 w-3 text-red-500" />
                            Valor anterior
                          </span>
                          <span className="font-medium text-sm capitalize">
                            {getValueDisplay(change.oldValue, change.field ?? '')}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-md border relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-green-400" />
                          <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Valor nuevo
                          </span>
                          <span className="font-medium text-sm capitalize">
                            {getValueDisplay(change.newValue, change.field ?? '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HistoryDialog({ open, onOpenChange, rowId }: Props) {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['daily-report-row-history', rowId],
    queryFn: () => getDailyReportRowHistory(rowId!),
    enabled: open && rowId != null,
    staleTime: 5 * 60 * 1000,
  });

  const sorted = [...(historyData ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <HistoryDialogSkeleton />
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mb-2 opacity-50" />
              <p>No hay registros de cambios para este ítem.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((entry, index) => (
                <HistoryEntryItem key={entry.id} entry={entry} isLast={index === sorted.length - 1} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
