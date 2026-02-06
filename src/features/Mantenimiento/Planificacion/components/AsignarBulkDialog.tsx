'use client';

import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateForDB } from '@/features/Mantenimiento/utils/dateFormat';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarIcon, Loader2, Wrench } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { toast } from 'sonner';
import type { SectorOccupancy } from '../actions/actionsServer';
import { assignWorkshopToItemsBulk, getSectorOccupancy } from '../actions/actionsServer';
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

  // Query para obtener todos los tipos de reparación
  const { data: repairTypes = [], isLoading: isLoadingRepairTypes } = useQuery({
    queryKey: ['types-of-repairs'],
    queryFn: fetchAllTypesOfRepairs,
  });

  // Estado del formulario
  const [workshopId, setWorkshopId] = useState<string>('');
  const [sectorId, setSectorId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Tipos de reparación seleccionados (se aplican a todos los items)
  const [selectedRepairTypeIds, setSelectedRepairTypeIds] = useState<string[]>([]);

  // Sectores filtrados por taller seleccionado
  const availableSectors = workshopId ? sectors.filter((s) => s.workshop_id === workshopId) : [];

  // Query para obtener la ocupación de sectores cuando se selecciona un taller
  const { data: sectorOccupancy = [], isLoading: isLoadingOccupancy } = useQuery({
    queryKey: ['sector-occupancy', workshopId],
    queryFn: () => getSectorOccupancy(workshopId),
    enabled: !!workshopId,
  });

  // Función para obtener la info de ocupación de un sector
  const getOccupancyInfo = (sectorId: string): SectorOccupancy | undefined => {
    return sectorOccupancy.find((s) => s.id === sectorId);
  };

  // Handler para togglear tipo de reparación
  const handleToggleRepairType = (repairTypeId: string) => {
    setSelectedRepairTypeIds((prev) =>
      prev.includes(repairTypeId) ? prev.filter((id) => id !== repairTypeId) : [...prev, repairTypeId]
    );
  };

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

    if (selectedRepairTypeIds.length === 0) {
      toast.error('Debe seleccionar al menos un tipo de reparación');
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
      const plannedStartDate = formatDateForDB(startDate);
      const plannedEndDate = formatDateForDB(endDate);

      await assignWorkshopToItemsBulk({
        itemIds: desvios.map((d) => d.id),
        workshopId,
        sectorId: sectorId || null,
        plannedStartDate,
        plannedEndDate,
        repairTypeIds: selectedRepairTypeIds,
      });

      toast.success(`${desvios.length} desvíos asignados correctamente`);
      queryClient.invalidateQueries({ queryKey: PLANIFICACION_QUERY_KEY });
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Error al guardar asignación en bulk', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar las asignaciones');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Asignar Taller y Período en Bulk</DialogTitle>
          <DialogDescription>
            Asignar los mismos valores a {desvios.length} desvío{desvios.length !== 1 ? 's' : ''} seleccionado
            {desvios.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Lista de desvíos seleccionados */}
            <div className="space-y-2">
              <Label>Desvíos seleccionados</Label>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {desvios.map((desvio) => {
                    // Usar repairTypeNames (pivot) o repairTypeName (legacy)
                    const repairTypes =
                      desvio.repairTypeNames?.length > 0
                        ? desvio.repairTypeNames
                        : desvio.repairTypeName
                          ? [desvio.repairTypeName]
                          : [];

                    return (
                      <div
                        key={desvio.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{desvio.itemLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {desvio.vehicleDomain || desvio.vehicleSerie || 'Sin identificar'}
                            {' | '}
                            {formatSectionCode(desvio.sectionCode)}
                          </p>
                        </div>
                        {repairTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-2 shrink-0 max-w-[120px] justify-end">
                            {repairTypes.map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  disabled={!workshopId || availableSectors.length === 0 || isLoadingOccupancy}
                >
                  <SelectTrigger id="sector-bulk">
                    <SelectValue
                      placeholder={
                        !workshopId
                          ? 'Seleccione taller primero'
                          : isLoadingOccupancy
                            ? 'Cargando disponibilidad...'
                            : availableSectors.length === 0
                              ? 'Sin sectores disponibles'
                              : 'Seleccionar sector (opcional)'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSectors.map((sector) => {
                      const occupancy = getOccupancyInfo(sector.id);
                      const hasCapacity = occupancy?.maxCapacity != null;
                      const isFull = hasCapacity && occupancy.currentOccupancy >= (occupancy.maxCapacity || 0);
                      const available = hasCapacity ? (occupancy.maxCapacity || 0) - occupancy.currentOccupancy : null;

                      return (
                        <SelectItem key={sector.id} value={sector.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{sector.name}</span>
                            {hasCapacity && (
                              <Badge
                                variant={isFull ? 'destructive' : available && available <= 2 ? 'warning' : 'secondary'}
                                className="text-xs ml-2"
                              >
                                {occupancy.currentOccupancy}/{occupancy.maxCapacity}
                                {isFull ? ' (Lleno)' : ` (${available} disp.)`}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {sectorId &&
                  (() => {
                    const occupancy = getOccupancyInfo(sectorId);
                    if (occupancy?.maxCapacity != null) {
                      const available = (occupancy.maxCapacity || 0) - occupancy.currentOccupancy;
                      const isOverCapacity = available <= 0;

                      // En bulk, considerar cuántos items se van a asignar
                      const willExceed = available < desvios.length;

                      if (isOverCapacity) {
                        return (
                          <div className="flex items-center gap-2 p-2 mt-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              <span className="font-medium">Aviso:</span> El sector está al límite de su capacidad (
                              {occupancy.currentOccupancy}/{occupancy.maxCapacity}). Puede continuar con la asignación.
                            </p>
                          </div>
                        );
                      }

                      if (willExceed) {
                        return (
                          <div className="flex items-center gap-2 p-2 mt-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              <span className="font-medium">Aviso:</span> Hay {available} cupos disponibles pero se
                              asignarán {desvios.length} items. Puede continuar con la asignación.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <p className="text-xs text-muted-foreground">
                          Disponibilidad: {available} de {occupancy.maxCapacity} cupos disponibles
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>

              {/* Tipos de Reparación */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Tipos de Reparación *
                </Label>
                <div className="text-xs text-muted-foreground mb-2">
                  Se aplicarán los mismos tipos de reparación a todos los desvíos seleccionados
                </div>
                {isLoadingRepairTypes ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : repairTypes.length === 0 ? (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
                    No hay tipos de reparación disponibles
                  </div>
                ) : (
                  <ScrollArea className="h-[160px] border rounded-md p-2">
                    <div className="space-y-2">
                      {repairTypes.map((repairType) => (
                        <div
                          key={repairType.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                          onClick={() => handleToggleRepairType(repairType.id)}
                        >
                          <Checkbox
                            id={`repair-bulk-${repairType.id}`}
                            checked={selectedRepairTypeIds.includes(repairType.id)}
                            onCheckedChange={() => handleToggleRepairType(repairType.id)}
                          />
                          <label htmlFor={`repair-bulk-${repairType.id}`} className="text-sm cursor-pointer flex-1">
                            {repairType.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                {selectedRepairTypeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedRepairTypeIds.map((id) => {
                      const repairType = repairTypes.find((rt) => rt.id === id);
                      return repairType ? (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {repairType.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
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
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
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
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
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
