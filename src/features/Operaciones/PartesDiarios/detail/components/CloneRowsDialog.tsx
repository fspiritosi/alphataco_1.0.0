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
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import React from 'react';
import { toast } from 'sonner';
import { cloneDailyReportRows } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

interface CloneRowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: DailyReportDetailRow[];
  dailyReportId: string;
  onSuccess: () => void;
}

export function CloneRowsDialog({ open, onOpenChange, selectedRows, onSuccess }: CloneRowsDialogProps) {
  const [selectedDates, setSelectedDates] = React.useState<Date[]>([]);
  const [includeEmployees, setIncludeEmployees] = React.useState(true);
  const [includeEquipment, setIncludeEquipment] = React.useState(true);

  const rowCount = selectedRows.length;

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const rowIds = selectedRows.map((r) => r.id);
      const targetDates = selectedDates.map((d) => moment(d).format('YYYY-MM-DD'));
      return cloneDailyReportRows(rowIds, targetDates, { includeEmployees, includeEquipment });
    },
    onSuccess: (result) => {
      const dateCount = selectedDates.length;
      toast.success(
        `Se clonaron ${result.clonedRowCount} registros en ${dateCount} ${dateCount === 1 ? 'fecha' : 'fechas'}`
      );
      handleClose();
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Ocurrió un error al clonar los registros');
    },
  });

  function handleClose() {
    onOpenChange(false);
    setSelectedDates([]);
    setIncludeEmployees(true);
    setIncludeEquipment(true);
  }

  function removeDate(date: Date) {
    setSelectedDates((prev) => prev.filter((d) => d.toDateString() !== date.toDateString()));
  }

  const canSubmit = selectedDates.length > 0 && !isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px] bg-white text-black p-0 gap-0 overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">Clonar registros seleccionados</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Se clonarán {rowCount} {rowCount === 1 ? 'registro' : 'registros'} a las fechas seleccionadas
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Calendar multi-select */}
          <div className="rounded-md border border-input bg-background p-4">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates: Date[] | undefined) => setSelectedDates(dates ?? [])}
              captionLayout="dropdown"
              className="rounded-lg border shadow-sm w-full"
            />
          </div>

          {/* Selected dates as removable badges */}
          {selectedDates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Fechas seleccionadas:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((date) => (
                  <Badge key={date.toISOString()} variant="secondary" className="flex items-center gap-1">
                    {moment(date).format('DD/MM/YYYY')}
                    <button
                      type="button"
                      onClick={() => removeDate(date)}
                      className="ml-1 rounded-full text-xs hover:bg-muted"
                      aria-label={`Eliminar fecha ${moment(date).format('DD/MM/YYYY')}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Opciones de clonado:</div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-employees"
                checked={includeEmployees}
                onCheckedChange={(checked) => setIncludeEmployees(checked as boolean)}
              />
              <Label htmlFor="include-employees">Incluir empleados (copiar empleados activos asignados)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-equipment"
                checked={includeEquipment}
                onCheckedChange={(checked) => setIncludeEquipment(checked as boolean)}
              />
              <Label htmlFor="include-equipment">Incluir equipos (copiar vehículos asignados)</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutate()} disabled={!canSubmit}>
            {isPending ? 'Clonando...' : 'Clonar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
