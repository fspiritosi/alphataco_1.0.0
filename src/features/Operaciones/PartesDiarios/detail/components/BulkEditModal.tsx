'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarIcon, CheckCircle2, Info, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { bulkUpdateRowStatus } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const BASE_OPTIONS = [
  { value: 'ejecutado', label: 'Ejecutado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'reprogramado', label: 'Reprogramado' },
];

const OPT_DIURNO = { value: 'completar_diurno', label: 'Completar Diurno' };
const OPT_NOCTURNO = { value: 'completar_nocturno', label: 'Completar Nocturno' };

type SectionKey = '24hs' | 'completar-diurno' | 'completar-nocturno' | 'otras';

interface SectionState {
  status: string;
  cancelReason: string;
  rescheduleDate: Date | undefined;
}

const EMPTY_SECTION: SectionState = {
  status: '',
  cancelReason: '',
  rescheduleDate: undefined,
};

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: DailyReportDetailRow[];
  dailyReportId: string;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkEditModal({ open, onOpenChange, selectedRows, dailyReportId, onSuccess }: Props) {
  const queryClient = useQueryClient();

  // ── Segmentación de la selección por jornada/turno (replicado de prod) ───
  const groups = useMemo(() => {
    const is24h = (r: DailyReportDetailRow) => r.working_day?.toLowerCase() === 'jornada 24 horas';

    return {
      jornadas24hs: selectedRows.filter((r) => is24h(r) && r.completed_day !== true && r.completed_night !== true),
      completarDiurno: selectedRows.filter((r) => is24h(r) && r.completed_night === true && r.completed_day !== true),
      completarNocturno: selectedRows.filter((r) => is24h(r) && r.completed_day === true && r.completed_night !== true),
      otrasJornadas: selectedRows.filter((r) => !is24h(r)),
    };
  }, [selectedRows]);

  const otrasTipos = useMemo(
    () => [...new Set(groups.otrasJornadas.map((r) => r.working_day).filter((w): w is string => Boolean(w)))],
    [groups.otrasJornadas]
  );

  // ── Estado por sección ────────────────────────────────────────────────────
  const [section24h, setSection24h] = useState<SectionState>(EMPTY_SECTION);
  const [sectionDiurno, setSectionDiurno] = useState<SectionState>(EMPTY_SECTION);
  const [sectionNocturno, setSectionNocturno] = useState<SectionState>(EMPTY_SECTION);
  const [sectionOtras, setSectionOtras] = useState<SectionState>(EMPTY_SECTION);
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [processedSections, setProcessedSections] = useState<Set<SectionKey>>(new Set());
  const [completedFlash, setCompletedFlash] = useState<SectionKey | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setSection24h(EMPTY_SECTION);
      setSectionDiurno(EMPTY_SECTION);
      setSectionNocturno(EMPTY_SECTION);
      setSectionOtras(EMPTY_SECTION);
      setSavingSection(null);
      setProcessedSections(new Set());
      setCompletedFlash(null);
    }
  }, [open]);

  const tomorrow = useMemo(() => moment().add(1, 'day').startOf('day').toDate(), []);

  // ── Mutación genérica que recibe sección + payload ───────────────────────
  const mutation = useMutation({
    mutationFn: async (params: {
      section: SectionKey;
      rowIds: string[];
      status: string;
      cancelReason?: string;
      rescheduleDate?: Date;
    }) => {
      const { rowIds, status } = params;

      // Pseudo-estados de jornada 24h
      if (status === 'completar_diurno') {
        return bulkUpdateRowStatus(rowIds, { completar_diurno: true });
      }
      if (status === 'completar_nocturno') {
        return bulkUpdateRowStatus(rowIds, { completar_nocturno: true });
      }

      return bulkUpdateRowStatus(rowIds, {
        status,
        ...(status === 'cancelado' && params.cancelReason ? { cancel_reason: params.cancelReason } : {}),
        ...(status === 'reprogramado' && params.rescheduleDate
          ? { reschedule_date: moment(params.rescheduleDate).format('YYYY-MM-DD') }
          : {}),
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-detail', dailyReportId] });
      queryClient.invalidateQueries({ queryKey: ['datatable-facet'] });
      queryClient.invalidateQueries({ queryKey: ['daily-report-deviations'] });

      setProcessedSections((prev) => new Set(prev).add(variables.section));
      setCompletedFlash(variables.section);
      setTimeout(() => setCompletedFlash(null), 3000);

      toast.success(
        `Se actualizó el estado de ${result.count} registro${result.count !== 1 ? 's' : ''} a "${variables.status}"`
      );
      onSuccess();

      // Si no quedan secciones activas pendientes, cerrar el modal
      const stillPending = activeSections.filter((s) => s !== variables.section && !processedSections.has(s));
      if (stillPending.length === 0) {
        onOpenChange(false);
      }
    },
    onError: () => {
      toast.error('Ocurrió un error al actualizar los registros');
    },
    onSettled: () => {
      setSavingSection(null);
    },
  });

  // ── Validación por sección ────────────────────────────────────────────────
  const isValid = (section: SectionState) => {
    if (!section.status) return false;
    if (section.status === 'cancelado' && !section.cancelReason.trim()) return false;
    if (section.status === 'reprogramado' && !section.rescheduleDate) return false;
    return true;
  };

  // ── Handler de guardado por sección ──────────────────────────────────────
  const handleSave = (section: SectionKey, state: SectionState, rows: DailyReportDetailRow[]) => {
    if (!isValid(state) || rows.length === 0) return;
    setSavingSection(section);
    mutation.mutate({
      section,
      rowIds: rows.map((r) => r.id),
      status: state.status,
      cancelReason: state.cancelReason,
      rescheduleDate: state.rescheduleDate,
    });
  };

  // ── Secciones activas (con filas) ─────────────────────────────────────────
  const activeSections: SectionKey[] = [
    ...(groups.jornadas24hs.length > 0 ? (['24hs'] as const) : []),
    ...(groups.completarDiurno.length > 0 ? (['completar-diurno'] as const) : []),
    ...(groups.completarNocturno.length > 0 ? (['completar-nocturno'] as const) : []),
    ...(groups.otrasJornadas.length > 0 ? (['otras'] as const) : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto gap-4">
        <DialogHeader>
          <DialogTitle>Edición masiva por estado</DialogTitle>
          <DialogDescription>
            Actualizando{' '}
            <strong className="text-foreground">
              {selectedRows.length} registro{selectedRows.length !== 1 ? 's' : ''}
            </strong>
            . Cada bloque se procesa por separado según el tipo de jornada y los turnos completados.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* ── Sección: Jornadas 24hs sin completar ──────────────────────── */}
        {groups.jornadas24hs.length > 0 && (
          <SectionBlock
            title={`Jornadas 24hs (${groups.jornadas24hs.length})`}
            description="Filas de jornada 24h sin turnos completados. Podés ejecutar, cancelar, reprogramar o marcar diurno/nocturno como completo."
            rows={groups.jornadas24hs}
            options={[...BASE_OPTIONS, OPT_DIURNO, OPT_NOCTURNO]}
            state={section24h}
            setState={setSection24h}
            isProcessed={processedSections.has('24hs')}
            isFlashing={completedFlash === '24hs'}
            isSaving={savingSection === '24hs'}
            isValid={isValid(section24h)}
            tomorrow={tomorrow}
            onSave={() => handleSave('24hs', section24h, groups.jornadas24hs)}
          />
        )}

        {/* ── Sub-sección: Completar Diurno (noche ya completa) ────────── */}
        {groups.completarDiurno.length > 0 && (
          <SectionBlock
            title={`Completar Diurno (${groups.completarDiurno.length})`}
            description="Filas 24h donde el turno nocturno ya está completo. Solo falta cerrar el diurno."
            rows={groups.completarDiurno}
            options={[...BASE_OPTIONS, OPT_DIURNO]}
            state={sectionDiurno}
            setState={setSectionDiurno}
            isProcessed={processedSections.has('completar-diurno')}
            isFlashing={completedFlash === 'completar-diurno'}
            isSaving={savingSection === 'completar-diurno'}
            isValid={isValid(sectionDiurno)}
            tomorrow={tomorrow}
            onSave={() => handleSave('completar-diurno', sectionDiurno, groups.completarDiurno)}
          />
        )}

        {/* ── Sub-sección: Completar Nocturno (día ya completo) ────────── */}
        {groups.completarNocturno.length > 0 && (
          <SectionBlock
            title={`Completar Nocturno (${groups.completarNocturno.length})`}
            description="Filas 24h donde el turno diurno ya está completo. Solo falta cerrar el nocturno."
            rows={groups.completarNocturno}
            options={[...BASE_OPTIONS, OPT_NOCTURNO]}
            state={sectionNocturno}
            setState={setSectionNocturno}
            isProcessed={processedSections.has('completar-nocturno')}
            isFlashing={completedFlash === 'completar-nocturno'}
            isSaving={savingSection === 'completar-nocturno'}
            isValid={isValid(sectionNocturno)}
            tomorrow={tomorrow}
            onSave={() => handleSave('completar-nocturno', sectionNocturno, groups.completarNocturno)}
          />
        )}

        {/* ── Sección: Otras Jornadas ──────────────────────────────────── */}
        {groups.otrasJornadas.length > 0 && (
          <SectionBlock
            title={`Otras Jornadas (${groups.otrasJornadas.length})${otrasTipos.length ? ` — ${otrasTipos.join(', ')}` : ''}`}
            description="Filas con jornadas distintas a 24h. Sin opciones de completar diurno/nocturno."
            rows={groups.otrasJornadas}
            options={BASE_OPTIONS}
            state={sectionOtras}
            setState={setSectionOtras}
            isProcessed={processedSections.has('otras')}
            isFlashing={completedFlash === 'otras'}
            isSaving={savingSection === 'otras'}
            isValid={isValid(sectionOtras)}
            tomorrow={tomorrow}
            onSave={() => handleSave('otras', sectionOtras, groups.otrasJornadas)}
          />
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SECTION BLOCK COMPONENT
// ============================================================================

interface SectionBlockProps {
  title: string;
  description: string;
  rows: DailyReportDetailRow[];
  options: { value: string; label: string }[];
  state: SectionState;
  setState: (next: SectionState) => void;
  isProcessed: boolean;
  isFlashing: boolean;
  isSaving: boolean;
  isValid: boolean;
  tomorrow: Date;
  onSave: () => void;
}

function SectionBlock({
  title,
  description,
  rows,
  options,
  state,
  setState,
  isProcessed,
  isFlashing,
  isSaving,
  isValid,
  tomorrow,
  onSave,
}: SectionBlockProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3 transition-colors',
        isProcessed && 'bg-green-50/50 border-green-300 dark:bg-green-950/20 dark:border-green-800',
        isFlashing && 'ring-2 ring-green-400'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            {isProcessed && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Procesado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Lista compacta de filas */}
      <ScrollArea className={cn('rounded border bg-muted/30', rows.length > 4 ? 'max-h-32' : 'max-h-fit')}>
        <ul className="px-2.5 py-2 space-y-1">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground truncate">{row.customers?.name ?? '—'}</span>
              <span className="text-muted-foreground/60">→</span>
              <span className="text-muted-foreground truncate">{row.customer_services?.service_name ?? '—'}</span>
              {(row.completed_day || row.completed_night) && (
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground italic">
                  {row.completed_day && row.completed_night
                    ? 'Ambos turnos'
                    : row.completed_day
                      ? 'Diurno OK'
                      : 'Nocturno OK'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>

      {/* Form de la sección — deshabilitado si ya fue procesada */}
      <fieldset disabled={isProcessed} className={cn('space-y-3', isProcessed && 'opacity-50')}>
        {/* Estado */}
        <div className="space-y-1.5">
          <Label className="text-xs">Nuevo estado</Label>
          <Select
            value={state.status}
            onValueChange={(val) => setState({ ...state, status: val, cancelReason: '', rescheduleDate: undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Motivo de cancelación */}
        {state.status === 'cancelado' && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              Motivo de cancelación <span className="text-red-500">*</span>
            </Label>
            <Input
              value={state.cancelReason}
              onChange={(e) => setState({ ...state, cancelReason: e.target.value })}
              placeholder="Ingrese el motivo de cancelación"
            />
          </div>
        )}

        {/* Fecha de reprogramación */}
        {state.status === 'reprogramado' && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              Fecha de reprogramación <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              <span>La fecha debe ser a partir de mañana</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start font-normal', !state.rescheduleDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {state.rescheduleDate ? moment(state.rescheduleDate).format('DD/MM/YYYY') : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={state.rescheduleDate}
                  onSelect={(d) => setState({ ...state, rescheduleDate: d ?? undefined })}
                  disabled={(date) => date < tomorrow}
                  captionLayout="dropdown"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Botón guardar de la sección */}
        <div className="flex justify-end pt-1">
          <Button type="button" size="sm" onClick={onSave} disabled={!isValid || isSaving || isProcessed}>
            {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {isProcessed ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Procesado
              </span>
            ) : (
              `Guardar (${rows.length})`
            )}
          </Button>
        </div>
      </fieldset>

      {/* Nota informativa cuando no hay opciones de completar */}
      {options.every((o) => o.value !== 'completar_diurno' && o.value !== 'completar_nocturno') && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>Las opciones de completar diurno/nocturno no aplican a este grupo.</span>
        </div>
      )}
    </div>
  );
}
