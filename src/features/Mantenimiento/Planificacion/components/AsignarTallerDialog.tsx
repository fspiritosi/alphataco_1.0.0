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
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ClipboardList, Loader2, Wrench } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { toast } from 'sonner';
import { assignWorkshopToItem, createWorkOrder } from '../actions/actionsServer';
import { PLANIFICACION_QUERY_KEY } from '../hooks/usePlanificacion';
import type { DesvioRowData } from './columns';

const logger = new Logger('AsignarTallerDialog');

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

interface AsignarTallerDialogProps {
  desvio: DesvioRowData;
  open: boolean;
  onClose: () => void;
  workshops: Workshop[];
  sectors: Sector[];
}

// Función para formatear el código de sección
const formatSectionCode = (code: string | null | undefined): string => {
  if (!code) return '-';
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function AsignarTallerDialog({ desvio, open, onClose, workshops, sectors }: AsignarTallerDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Query para obtener todos los tipos de reparación
  const { data: repairTypes = [], isLoading: isLoadingRepairTypes } = useQuery({
    queryKey: ['types-of-repairs'],
    queryFn: fetchAllTypesOfRepairs,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Estado del formulario
  const [workshopId, setWorkshopId] = useState<string>(desvio.workshopId || '');
  const [sectorId, setSectorId] = useState<string>(desvio.sectorId || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    desvio.startDate ? new Date(desvio.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(desvio.endDate ? new Date(desvio.endDate) : undefined);
  const [generateWorkOrder, setGenerateWorkOrder] = useState(false);

  // Tipos de reparación seleccionados (inicializar desde el desvío si existen)
  const [selectedRepairTypeIds, setSelectedRepairTypeIds] = useState<string[]>(
    desvio.repairTypeIds?.length > 0 ? desvio.repairTypeIds : desvio.repairTypeId ? [desvio.repairTypeId] : []
  );

  // Sectores filtrados por taller seleccionado
  const availableSectors = workshopId ? sectors.filter((s) => s.workshop_id === workshopId) : [];

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
      const plannedStartDate = moment(startDate).format('YYYY-MM-DD');
      const plannedEndDate = moment(endDate).format('YYYY-MM-DD');

      if (generateWorkOrder) {
        // Crear orden de trabajo directamente
        const result = await createWorkOrder({
          itemIds: [desvio.id],
          workshopId,
          sectorId: sectorId || null,
          plannedStartDate,
          plannedEndDate,
          repairTypeIds: selectedRepairTypeIds,
        });

        toast.success(`Orden de trabajo ${result.orderNumber} creada exitosamente`);
        logger.info('Orden de trabajo creada', { data: result });
      } else {
        // Solo asignar sin crear OT
        await assignWorkshopToItem({
          maintenanceOrderItemId: desvio.id,
          workshopId,
          sectorId: sectorId || null,
          plannedStartDate,
          plannedEndDate,
          repairTypeIds: selectedRepairTypeIds,
        });

        toast.success('Asignación guardada correctamente');
      }

      // Invalidar todas las vistas relacionadas
      queryClient.invalidateQueries({ queryKey: PLANIFICACION_QUERY_KEY });
      // Si se creó una OT, invalidar también la vista de Órdenes de Trabajo
      if (generateWorkOrder) {
        queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      }
      onClose();
    } catch (error) {
      logger.error('Error al guardar asignación', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar la asignación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Asignar Taller y Período</DialogTitle>
          <DialogDescription>Configure la asignación para este desvío</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Info del desvío */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{desvio.itemLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Sección: {formatSectionCode(desvio.sectionCode)}
                    {desvio.itemCode && ` | Código: ${desvio.itemCode}`}
                  </p>
                </div>
                {/* Mostrar tipos de reparación actuales si existen */}
                {(desvio.repairTypeNames?.length > 0 || desvio.repairTypeName) && (
                  <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                    {(desvio.repairTypeNames?.length > 0 ? desvio.repairTypeNames : [desvio.repairTypeName]).map(
                      (name, idx) =>
                        name && (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        )
                    )}
                  </div>
                )}
              </div>
              {desvio.driverComment && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Comentario del chofer: </span>
                    <span className="italic">{desvio.driverComment}</span>
                  </div>
                </>
              )}
              {desvio.description && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Descripción: </span>
                    <span>{desvio.description}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Equipo: </span>
                  <span className="font-medium">
                    {desvio.vehicleDomain || desvio.vehicleSerie || 'Sin identificar'}
                    {desvio.vehicleInternNumber && ` (#${desvio.vehicleInternNumber})`}
                  </span>
                </div>
                {desvio.workshopEntryDate && (
                  <div>
                    <span className="text-muted-foreground">Entrada: </span>
                    <span className="font-medium">{moment(desvio.workshopEntryDate).format('DD/MM/YYYY')}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Formulario de asignación */}
            <div className="space-y-4">
              {/* Taller */}
              <div className="space-y-2">
                <Label htmlFor="workshop">Taller *</Label>
                <Select value={workshopId} onValueChange={handleWorkshopChange}>
                  <SelectTrigger id="workshop">
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
                <Label htmlFor="sector">Sector</Label>
                <Select
                  value={sectorId}
                  onValueChange={setSectorId}
                  disabled={!workshopId || availableSectors.length === 0}
                >
                  <SelectTrigger id="sector">
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

              {/* Tipos de Reparación */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Tipos de Reparación *
                </Label>
                <div className="text-xs text-muted-foreground mb-2">
                  Seleccione las tareas a realizar para la resolución del desvío
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
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {repairTypes.map((repairType) => (
                        <div
                          key={repairType.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                          onClick={() => handleToggleRepairType(repairType.id)}
                        >
                          <Checkbox
                            id={`repair-${repairType.id}`}
                            checked={selectedRepairTypeIds.includes(repairType.id)}
                            onCheckedChange={() => handleToggleRepairType(repairType.id)}
                          />
                          <label htmlFor={`repair-${repairType.id}`} className="text-sm cursor-pointer flex-1">
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

              <Separator />

              {/* Opción para generar OT */}
              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Checkbox
                  id="generateWorkOrder"
                  checked={generateWorkOrder}
                  onCheckedChange={(checked) => setGenerateWorkOrder(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="generateWorkOrder" className="flex items-center gap-2 cursor-pointer font-medium">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    Generar Orden de Trabajo
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si se marca, se creará una OT automáticamente con este item
                  </p>
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
            {generateWorkOrder ? 'Crear Orden de Trabajo' : 'Guardar Asignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
