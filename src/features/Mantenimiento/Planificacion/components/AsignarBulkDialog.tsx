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
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { toast } from 'sonner';
import { PLANIFICACION_QUERY_KEY } from '../hooks/usePlanificacion';
import type { DesvioRowData } from './columns';

const logger = new Logger('AsignarBulkDialog');

interface Workshop {
  id: string;
  name: string;
  workshop_type: string;
}

interface Sector {
  id: string;
  name: string;
  workshop_id: string;
}

interface AsignarBulkDialogProps {
  desvios: DesvioRowData[];
  open: boolean;
  onClose: () => void;
  workshops: Workshop[];
  sectors: Sector[];
  onSuccess?: () => void;
}

// Función para formatear el código de sección
const formatSectionCode = (code: string | null | undefined): string => {
  if (!code) return '-';
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function AsignarBulkDialog({ desvios, open, onClose, workshops, sectors, onSuccess }: AsignarBulkDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Estado del formulario
  const [workshopId, setWorkshopId] = useState<string>('');
  const [sectorId, setSectorId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Sectores filtrados por taller seleccionado
  const availableSectors = workshopId ? sectors.filter((s) => s.workshop_id === workshopId) : [];

  const handleWorkshopChange = (value: string) => {
    setWorkshopId(value);
    setSectorId(''); // Reset sector al cambiar taller
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!workshopId) {
      toast.error('Debe seleccionar un taller');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Debe seleccionar el período de fechas');
      return;
    }

    if (moment(startDate).isAfter(endDate)) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implementar la actualización de asignación en bulk en el servidor
      logger.info('Guardando asignación en bulk', {
        data: {
          desviosIds: desvios.map((d) => d.id),
          workshopId,
          sectorId: sectorId || null,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      // Simulación - aquí iría la llamada al servidor
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(`${desvios.length} desvíos asignados correctamente`);
      queryClient.invalidateQueries({ queryKey: PLANIFICACION_QUERY_KEY });
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Error al guardar asignación en bulk', { data: { error } });
      toast.error('Error al guardar las asignaciones');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar Taller y Período en Bulk</DialogTitle>
          <DialogDescription>
            Asignar los mismos valores a {desvios.length} desvío{desvios.length !== 1 ? 's' : ''} seleccionado
            {desvios.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de desvíos seleccionados */}
          <div className="space-y-2">
            <Label>Desvíos seleccionados</Label>
            <ScrollArea className="h-[150px] border rounded-md p-2">
              <div className="space-y-2">
                {desvios.map((desvio) => (
                  <div key={desvio.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{desvio.itemLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {desvio.vehicleDomain || desvio.vehicleSerie || 'Sin identificar'}
                        {' | '}
                        {formatSectionCode(desvio.sectionCode)}
                      </p>
                    </div>
                    {desvio.repairTypeName && (
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {desvio.repairTypeName}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Formulario de asignación */}
          <div className="space-y-4">
            {/* Taller */}
            <div className="space-y-2">
              <Label htmlFor="workshop-bulk">Taller *</Label>
              <Select value={workshopId} onValueChange={handleWorkshopChange}>
                <SelectTrigger id="workshop-bulk">
                  <SelectValue placeholder="Seleccionar taller" />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((workshop) => (
                    <SelectItem key={workshop.id} value={workshop.id}>
                      {workshop.name}
                      <span className="text-muted-foreground text-xs ml-2">
                        ({workshop.workshop_type === 'interno' ? 'Interno' : 'Externo'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sector */}
            <div className="space-y-2">
              <Label htmlFor="sector-bulk">Sector</Label>
              <Select
                value={sectorId}
                onValueChange={setSectorId}
                disabled={!workshopId || availableSectors.length === 0}
              >
                <SelectTrigger id="sector-bulk">
                  <SelectValue
                    placeholder={
                      !workshopId
                        ? 'Seleccione taller primero'
                        : availableSectors.length === 0
                          ? 'Sin sectores disponibles'
                          : 'Seleccionar sector (opcional)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período de fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={es}
                      disabled={(date) => (startDate ? date < startDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar a {desvios.length} desvío{desvios.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
