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
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
      <DialogContent className="sm:max-w-[500px] bg-white text-black p-0 gap-0 overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">
            {isAllMode ? `Clonar registros del ${formattedReportDate}` : 'Clonar registros seleccionados'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isAllMode
              ? 'Se clonarán las filas seleccionadas del parte a las fechas indicadas.'
              : `Se clonarán ${rowCount} ${rowCount === 1 ? 'registro' : 'registros'} a las fechas seleccionadas`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-4">
          {/* Calendar */}
          <div className="space-y-4">
            <div className="rounded-md border-input bg-background p-4">
              <div className="w-full">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates: Date[] | undefined) => setSelectedDates(dates ?? [])}
                  captionLayout="dropdown"
                  locale={es}
                  className="rounded-lg border shadow-sm w-full"
                  disabled={(date) => moment(date).isBefore(moment().subtract(1, 'days'))}
                />
              </div>
            </div>

            {/* Fechas seleccionadas como badges removibles */}
            {selectedDates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Fechas seleccionadas:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map((date) => (
                    <Badge key={date.toISOString()} variant="secondary" className="flex items-center gap-1">
                      {format(date, 'dd/MM/yyyy', { locale: es })}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeDate(date);
                        }}
                        className="ml-1 rounded-full text-xs hover:bg-muted"
                        aria-label="Eliminar fecha"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2 mt-4">
            {/* Tipos de registro */}
            <div className="text-sm font-medium mb-1">Tipos de registros a clonar:</div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-mensuales"
                checked={displayMensuales}
                disabled={!mensualesExist || !isAllMode}
                onCheckedChange={(checked) => {
                  if (isAllMode) setIncludeMensuales(checked as boolean);
                }}
              />
              <Label htmlFor="include-mensuales" className={!mensualesExist || !isAllMode ? 'text-gray-400' : ''}>
                Incluir registros Mensuales{!mensualesExist && isAllMode && ' (No hay registros)'}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-adicionales"
                checked={displayAdicionales}
                disabled={!adicionalesExist || !isAllMode}
                onCheckedChange={(checked) => {
                  if (isAllMode) setIncludeAdicionales(checked as boolean);
                }}
              />
              <Label htmlFor="include-adicionales" className={!adicionalesExist || !isAllMode ? 'text-gray-400' : ''}>
                Incluir registros Adicionales{!adicionalesExist && isAllMode && ' (No hay registros)'}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-adicionales-permanentes"
                checked={displayAdicionalesPermanentes}
                disabled={!adicionalesPermanentesExist || !isAllMode}
                onCheckedChange={(checked) => {
                  if (isAllMode) setIncludeAdicionalesPermanentes(checked as boolean);
                }}
              />
              <Label
                htmlFor="include-adicionales-permanentes"
                className={!adicionalesPermanentesExist || !isAllMode ? 'text-gray-400' : ''}
              >
                Incluir registros Adicionales Permanentes
                {!adicionalesPermanentesExist && isAllMode && ' (No hay registros)'}
              </Label>
            </div>

            {/* Indicador "Solo clonar registros seleccionados" (decorativo, siempre disabled) */}
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox id="solo-seleccionados" checked={!isAllMode} disabled={true} />
              <Label htmlFor="solo-seleccionados" className={isAllMode ? 'text-gray-400' : ''}>
                Solo clonar registros seleccionados
                {isAllMode && ' (No hay registros seleccionados)'}
              </Label>
            </div>

            {/* Recursos */}
            <div className="border-t pt-4 mt-4">
              <div className="text-sm font-medium mb-2">Trasladar recursos:</div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-employees"
                  checked={includeEmployees}
                  onCheckedChange={(checked) => setIncludeEmployees(checked as boolean)}
                />
                <Label htmlFor="include-employees">
                  Trasladar Personal (copiar empleados asignados a las nuevas filas)
                </Label>
              </div>

              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="include-equipment"
                  checked={includeEquipment}
                  onCheckedChange={(checked) => setIncludeEquipment(checked as boolean)}
                />
                <Label htmlFor="include-equipment">
                  Trasladar Equipos (copiar vehículos asignados a las nuevas filas)
                </Label>
              </div>
            </div>

            {/* Navegación al parte clonado */}
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox
                id="navigate-after-clone"
                checked={navigateAfterClone}
                disabled={selectedDates.length > 1}
                onCheckedChange={(checked) => setNavigateAfterClone(checked as boolean)}
              />
              <Label htmlFor="navigate-after-clone" className={selectedDates.length > 1 ? 'text-muted-foreground' : ''}>
                Ir a los registros clonados al finalizar
                {selectedDates.length > 1 && ' (deshabilitado por tener más de 1 fecha seleccionada)'}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Clonando...' : 'Clonar registros'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
