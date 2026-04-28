'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Info, X } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cloneDailyReportRows, getDailyReportTypeServiceSummary } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

interface CloneRowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'selected' = clonar solo las filas seleccionadas; 'all' = clonar todo el parte */
  mode: 'selected' | 'all';
  selectedRows: DailyReportDetailRow[];
  dailyReportId: string;
  /** Fecha del parte en formato YYYY-MM-DD o ISO — se muestra en el título */
  reportDate: string;
  onSuccess: () => void;
}

export function CloneRowsDialog({
  open,
  onOpenChange,
  mode,
  selectedRows,
  dailyReportId,
  reportDate,
  onSuccess,
}: CloneRowsDialogProps) {
  const router = useRouter();
  const isAllMode = mode === 'all';

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // ── Recursos (opt-in, default OFF como en legacy) ──────────────────────────
  const [includeEmployees, setIncludeEmployees] = useState(false);
  const [includeEquipment, setIncludeEquipment] = useState(false);

  // ── Navegación al parte clonado ────────────────────────────────────────────
  const [navigateAfterClone, setNavigateAfterClone] = useState(true);

  // Deshabilitar "ir a registros" cuando hay más de 1 fecha
  useEffect(() => {
    if (selectedDates.length > 1) {
      setNavigateAfterClone(false);
    }
  }, [selectedDates.length]);

  // ── Tipos de servicio (solo en modo 'all') ─────────────────────────────────
  const { data: typeServiceSummary } = useQuery({
    queryKey: ['daily-report-type-service-summary', dailyReportId],
    queryFn: () => getDailyReportTypeServiceSummary(dailyReportId),
    enabled: open && isAllMode,
    staleTime: 30_000,
  });

  // Existencia de cada tipo
  const mensualesExist = (typeServiceSummary?.['mensual'] ?? 0) > 0;
  const adicionalesExist = (typeServiceSummary?.['adicional'] ?? 0) > 0;
  const adicionalesPermanentesExist = (typeServiceSummary?.['adicional_permanente'] ?? 0) > 0;

  // Checkboxes de tipo (habilitados solo en modo 'all')
  const [includeMensuales, setIncludeMensuales] = useState(false);
  const [includeAdicionales, setIncludeAdicionales] = useState(false);
  const [includeAdicionalesPermanentes, setIncludeAdicionalesPermanentes] = useState(false);

  // Sincronizar defaults cuando cambia el resumen de tipos (solo en modo 'all')
  useEffect(() => {
    if (!isAllMode || !typeServiceSummary) return;
    setIncludeMensuales((typeServiceSummary['mensual'] ?? 0) > 0);
    setIncludeAdicionales((typeServiceSummary['adicional'] ?? 0) > 0);
    setIncludeAdicionalesPermanentes((typeServiceSummary['adicional_permanente'] ?? 0) > 0);
  }, [isAllMode, typeServiceSummary]);

  // ── Tipos de servicio derivados de las filas seleccionadas (modo 'selected') ─
  const selectedMensualesExist = selectedRows.some((r) => r.type_service === 'mensual');
  const selectedAdicionalesExist = selectedRows.some((r) => r.type_service === 'adicional');
  const selectedAdicionalesPermanentesExist = selectedRows.some((r) => r.type_service === 'adicional_permanente');

  // En modo 'selected', los checkboxes de tipo muestran la realidad pero están disabled
  const displayMensuales = isAllMode ? includeMensuales : selectedMensualesExist;
  const displayAdicionales = isAllMode ? includeAdicionales : selectedAdicionalesExist;
  const displayAdicionalesPermanentes = isAllMode ? includeAdicionalesPermanentes : selectedAdicionalesPermanentesExist;

  // ── Mutación ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const targetDates = selectedDates.map((d) => moment(d).format('YYYY-MM-DD'));

      if (isAllMode) {
        // Construir filtro de tipos (solo los marcados)
        const typeFilter: Array<'mensual' | 'adicional' | 'adicional_permanente'> = [];
        if (includeMensuales) typeFilter.push('mensual');
        if (includeAdicionales) typeFilter.push('adicional');
        if (includeAdicionalesPermanentes) typeFilter.push('adicional_permanente');

        return cloneDailyReportRows([], targetDates, {
          includeEmployees,
          includeEquipment,
          cloneAllFromReportId: dailyReportId,
          ...(typeFilter.length > 0 ? { typeServiceFilter: typeFilter } : {}),
        });
      }

      const rowIds = selectedRows.map((r) => r.id);
      return cloneDailyReportRows(rowIds, targetDates, { includeEmployees, includeEquipment });
    },
    onSuccess: (result) => {
      const dateCount = selectedDates.length;
      toast.success(
        `Se clonaron ${result.clonedRowCount} registros en ${dateCount} ${dateCount === 1 ? 'fecha' : 'fechas'}`
      );

      // Determinar si navegar al parte clonado
      // Navegar al primer reporte de la fecha destino (nuevo o existente)
      const reportIds = result.allReportIds ?? [];
      const shouldNavigate = navigateAfterClone && selectedDates.length === 1 && reportIds.length > 0;

      const navigateToId = shouldNavigate ? reportIds[0] : null;

      handleClose();
      onSuccess();

      if (navigateToId) {
        setTimeout(() => {
          router.push(`/dashboard/operations/${navigateToId}`);
        }, 300);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Ocurrió un error al clonar los registros');
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleClose() {
    onOpenChange(false);
    setSelectedDates([]);
    setIncludeEmployees(false);
    setIncludeEquipment(false);
    setNavigateAfterClone(true);
  }

  function removeDate(date: Date) {
    setSelectedDates((prev) => prev.filter((d) => d.toDateString() !== date.toDateString()));
  }

  function handleSubmit() {
    if (selectedDates.length === 0) {
      toast.error('Debes seleccionar al menos una fecha para clonar los registros');
      return;
    }

    if (isAllMode && !includeMensuales && !includeAdicionales && !includeAdicionalesPermanentes) {
      toast.error('Debes seleccionar al menos un tipo de registro a clonar');
      return;
    }

    mutate();
  }

  // ── Validación UI ──────────────────────────────────────────────────────────
  const canSubmit = selectedDates.length > 0 && !isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  const formattedReportDate = moment(reportDate).format('DD/MM/YYYY');
  const rowCount = selectedRows.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto gap-4">
        <DialogHeader className="space-y-1.5">
          <DialogTitle>
            {isAllMode ? `Clonar registros del ${formattedReportDate}` : 'Clonar registros seleccionados'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isAllMode
              ? 'Seleccioná las fechas destino y los tipos de registros a clonar.'
              : `Se clonarán ${rowCount} ${rowCount === 1 ? 'registro' : 'registros'} a las fechas que selecciones.`}
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
            {/* ── Columna izquierda: Calendario + chips de fechas ─────────────── */}
            <div className="space-y-3">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates: Date[] | undefined) => setSelectedDates(dates ?? [])}
                captionLayout="dropdown"
                locale={es}
                disabled={(date) => moment(date).isBefore(moment().subtract(1, 'days'))}
                className="rounded-md border"
              />

              {selectedDates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDates.map((date) => (
                    <Badge key={date.toISOString()} variant="secondary" className="gap-1 pl-2 pr-1">
                      {format(date, 'dd/MM/yyyy', { locale: es })}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeDate(date);
                        }}
                        className="rounded-full hover:bg-muted-foreground/20 size-4 inline-flex items-center justify-center transition-colors"
                        aria-label={`Eliminar ${format(date, 'dd/MM/yyyy')}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Seleccioná una o más fechas en el calendario</p>
              )}
            </div>

            {/* ── Columna derecha: Opciones ──────────────────────────────────── */}
            <div className="flex flex-col gap-5">
              {/* Tipos de registros */}
              <section className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-medium">Tipos de registros</h4>
                  {!isAllMode && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">Los tipos vienen de las filas seleccionadas y no se pueden cambiar.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {isAllMode ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-mensuales"
                        checked={displayMensuales}
                        disabled={!mensualesExist}
                        onCheckedChange={(checked) => setIncludeMensuales(checked as boolean)}
                      />
                      <Label
                        htmlFor="include-mensuales"
                        className={cn('text-sm font-normal', !mensualesExist && 'text-muted-foreground')}
                      >
                        Mensuales {!mensualesExist && <span className="text-xs">(no hay)</span>}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-adicionales"
                        checked={displayAdicionales}
                        disabled={!adicionalesExist}
                        onCheckedChange={(checked) => setIncludeAdicionales(checked as boolean)}
                      />
                      <Label
                        htmlFor="include-adicionales"
                        className={cn('text-sm font-normal', !adicionalesExist && 'text-muted-foreground')}
                      >
                        Adicionales {!adicionalesExist && <span className="text-xs">(no hay)</span>}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-adicionales-permanentes"
                        checked={displayAdicionalesPermanentes}
                        disabled={!adicionalesPermanentesExist}
                        onCheckedChange={(checked) => setIncludeAdicionalesPermanentes(checked as boolean)}
                      />
                      <Label
                        htmlFor="include-adicionales-permanentes"
                        className={cn('text-sm font-normal', !adicionalesPermanentesExist && 'text-muted-foreground')}
                      >
                        Adicionales permanentes
                        {!adicionalesPermanentesExist && <span className="text-xs"> (no hay)</span>}
                      </Label>
                    </div>
                  </div>
                ) : (
                  // En modo "selected" se muestran los tipos detectados como chips informativos
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMensualesExist && (
                      <Badge variant="outline" className="font-normal">
                        Mensuales
                      </Badge>
                    )}
                    {selectedAdicionalesExist && (
                      <Badge variant="outline" className="font-normal">
                        Adicionales
                      </Badge>
                    )}
                    {selectedAdicionalesPermanentesExist && (
                      <Badge variant="outline" className="font-normal">
                        Adicionales permanentes
                      </Badge>
                    )}
                  </div>
                )}
              </section>

              <Separator />

              {/* Recursos a trasladar */}
              <section className="space-y-3">
                <h4 className="text-sm font-medium">Recursos a trasladar</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="include-employees"
                      checked={includeEmployees}
                      onCheckedChange={(checked) => setIncludeEmployees(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-0.5 leading-none">
                      <Label htmlFor="include-employees" className="text-sm font-normal">
                        Personal
                      </Label>
                      <p className="text-xs text-muted-foreground">Copia los empleados asignados a las nuevas filas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="include-equipment"
                      checked={includeEquipment}
                      onCheckedChange={(checked) => setIncludeEquipment(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-0.5 leading-none">
                      <Label htmlFor="include-equipment" className="text-sm font-normal">
                        Equipos
                      </Label>
                      <p className="text-xs text-muted-foreground">Copia los vehículos asignados a las nuevas filas</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Navegación al finalizar */}
              <section>
                {selectedDates.length > 1 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-flex items-center gap-2 cursor-not-allowed">
                        <Checkbox id="navigate-after-clone" checked={false} disabled />
                        <Label htmlFor="navigate-after-clone" className="text-sm font-normal text-muted-foreground">
                          Ir a los registros clonados al finalizar
                        </Label>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Solo disponible al clonar a una sola fecha</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="navigate-after-clone"
                      checked={navigateAfterClone}
                      onCheckedChange={(checked) => setNavigateAfterClone(checked as boolean)}
                    />
                    <Label htmlFor="navigate-after-clone" className="text-sm font-normal">
                      Ir a los registros clonados al finalizar
                    </Label>
                  </div>
                )}
              </section>
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="min-w-32">
            {isPending ? 'Clonando...' : 'Clonar registros'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
