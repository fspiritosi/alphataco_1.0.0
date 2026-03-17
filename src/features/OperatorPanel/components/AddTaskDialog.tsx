'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { useOperatorContext } from '@/features/OperatorPanel/components/operator-layout-provider';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  Car,
  Info,
  Loader2,
  PackageOpen,
  Settings2,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  addTaskToOwnWorkOrder,
  getAllRepairTypes,
  getRepairTypesForSector,
  requestTaskForOtherSector,
} from '../actions/actionsServer';

const logger = new Logger('AddTaskDialog');

interface VehicleContext {
  domain?: string | null;
  internNumber?: string | null;
  subType?: string | null;
}

interface AddTaskDialogProps {
  workOrderId: string;
  maintenanceOrderId: string | null;
  maintenanceOrderNumber?: string | null;
  vehicleContext?: VehicleContext | null;
  sectorName?: string | null;
  open: boolean;
  onClose: () => void;
}

export function AddTaskDialog({
  workOrderId,
  maintenanceOrderId,
  maintenanceOrderNumber,
  vehicleContext,
  sectorName,
  open,
  onClose,
}: AddTaskDialogProps) {
  const queryClient = useQueryClient();
  const { sectorId } = useOperatorContext();

  const [activeTab, setActiveTab] = useState<'own' | 'other'>('own');
  const [ownRepairTypeId, setOwnRepairTypeId] = useState<string>('');
  const [ownDescription, setOwnDescription] = useState('');
  const [otherRepairTypeId, setOtherRepairTypeId] = useState<string>('');
  const [otherDescription, setOtherDescription] = useState('');

  // Validation state
  const [ownErrors, setOwnErrors] = useState<{ repairType?: string; description?: string }>({});
  const [otherErrors, setOtherErrors] = useState<{ repairType?: string; description?: string }>({});

  const { data: sectorRepairTypes = [], isLoading: isLoadingSectorTypes } = useQuery({
    queryKey: ['operator-sector-repair-types', sectorId],
    queryFn: () => getRepairTypesForSector(sectorId),
    enabled: open && activeTab === 'own',
  });

  const { data: allRepairTypes = [], isLoading: isLoadingAllTypes } = useQuery({
    queryKey: ['operator-all-repair-types'],
    queryFn: () => getAllRepairTypes(),
    enabled: open && activeTab === 'other' && !!maintenanceOrderId,
  });

  const selectedOwnRepairType = sectorRepairTypes.find((rt) => rt.id === ownRepairTypeId);
  const selectedOtherRepairType = allRepairTypes.find((rt) => rt.id === otherRepairTypeId);

  // --- Validation ---

  const validateOwn = (): boolean => {
    const errors: { repairType?: string; description?: string } = {};
    if (!ownRepairTypeId) errors.repairType = 'Seleccione un tipo de reparacion';
    if (!ownDescription.trim()) errors.description = 'La descripcion es requerida';
    setOwnErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOther = (): boolean => {
    const errors: { repairType?: string; description?: string } = {};
    if (!otherRepairTypeId) errors.repairType = 'Seleccione un tipo de reparacion';
    if (!otherDescription.trim()) errors.description = 'La descripcion es requerida';
    setOtherErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Mutations ---

  const addOwnTaskMutation = useMutation({
    mutationFn: async () => {
      if (!validateOwn()) throw new Error('VALIDATION');
      const isAutorizable = selectedOwnRepairType?.autorizable || false;
      return addTaskToOwnWorkOrder(workOrderId, ownRepairTypeId, ownDescription.trim(), isAutorizable);
    },
    onSuccess: (result) => {
      toast.success(result.requiresApproval ? 'Solicitud enviada al jefe de taller' : 'Tarea agregada');
      queryClient.invalidateQueries({ queryKey: ['operator-work-order'] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
      invalidateAllMaintenanceQueries(queryClient);
      resetForm();
      onClose();
    },
    onError: (error) => {
      if (error.message === 'VALIDATION') return;
      logger.error('Error adding task to own work order', { data: { error } });
      toast.error('Error al agregar la tarea');
    },
  });

  const addOtherTaskMutation = useMutation({
    mutationFn: async () => {
      if (!maintenanceOrderId) throw new Error('No se pudo obtener la orden de mantenimiento');
      if (!validateOther()) throw new Error('VALIDATION');
      return requestTaskForOtherSector(maintenanceOrderId, otherRepairTypeId, otherDescription.trim());
    },
    onSuccess: () => {
      toast.success('Solicitud enviada al jefe de taller');
      queryClient.invalidateQueries({ queryKey: ['operator-work-order'] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
      invalidateAllMaintenanceQueries(queryClient);
      resetForm();
      onClose();
    },
    onError: (error) => {
      if (error.message === 'VALIDATION') return;
      logger.error('Error requesting task for other sector', { data: { error } });
      toast.error('Error al enviar la solicitud');
    },
  });

  const resetForm = () => {
    setOwnRepairTypeId('');
    setOwnDescription('');
    setOtherRepairTypeId('');
    setOtherDescription('');
    setOwnErrors({});
    setOtherErrors({});
    setActiveTab('own');
  };

  const handleClose = () => {
    if (addOwnTaskMutation.isPending || addOtherTaskMutation.isPending) return;
    resetForm();
    onClose();
  };

  // Clear field errors on change
  const handleOwnRepairTypeChange = (value: string) => {
    setOwnRepairTypeId(value);
    if (ownErrors.repairType) setOwnErrors((prev) => ({ ...prev, repairType: undefined }));
  };

  const handleOwnDescriptionChange = (value: string) => {
    setOwnDescription(value);
    if (ownErrors.description) setOwnErrors((prev) => ({ ...prev, description: undefined }));
  };

  const handleOtherRepairTypeChange = (value: string) => {
    setOtherRepairTypeId(value);
    if (otherErrors.repairType) setOtherErrors((prev) => ({ ...prev, repairType: undefined }));
  };

  const handleOtherDescriptionChange = (value: string) => {
    setOtherDescription(value);
    if (otherErrors.description) setOtherErrors((prev) => ({ ...prev, description: undefined }));
  };

  const hasSectorRepairTypes = !isLoadingSectorTypes && sectorRepairTypes.length > 0;
  const hasNoSectorRepairTypes = !isLoadingSectorTypes && sectorRepairTypes.length === 0;

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose} title="Agregar Tarea" className="sm:max-w-lg">
      {/* Contextual header */}
      {(vehicleContext || maintenanceOrderNumber) && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5 mb-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
              {vehicleContext?.domain && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {vehicleContext.domain}
                </Badge>
              )}
              {vehicleContext?.subType && (
                <span className="text-sm text-foreground truncate">{vehicleContext.subType}</span>
              )}
            </div>
            {vehicleContext?.internNumber && (
              <span className="text-xs text-muted-foreground shrink-0">N.I {vehicleContext.internNumber}</span>
            )}
          </div>
          {maintenanceOrderNumber && (
            <p className="text-xs text-muted-foreground mt-1.5">
              OM: <span className="font-medium text-foreground">{maintenanceOrderNumber}</span>
            </p>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'own' | 'other')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="own" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Mi Sector
            {sectorName && (
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">({sectorName})</span>
            )}
          </TabsTrigger>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <TabsTrigger value="other" disabled={!maintenanceOrderId} className="gap-1.5 w-full">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Otro Sector
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!maintenanceOrderId && (
                <TooltipContent side="bottom">
                  <p className="text-xs">No hay orden de mantenimiento asociada para derivar tareas</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </TabsList>

        {/* ═══════════════════ Mi Sector ═══════════════════ */}
        <TabsContent value="own" className="space-y-4 pt-4">
          {hasNoSectorRepairTypes ? (
            /* Empty state — no hay tipos configurados para este sector */
            <div className="flex flex-col items-center text-center py-6 px-4 space-y-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-950/50 p-3">
                <PackageOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Sin tipos de reparacion disponibles</p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Este sector no tiene tipos de reparacion configurados. Contacte al jefe de taller o administrador para
                  que asigne tipos de reparacion al sector.
                </p>
              </div>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                Mientras tanto, puede solicitar una tarea a{' '}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={() => maintenanceOrderId && setActiveTab('other')}
                  disabled={!maintenanceOrderId}
                >
                  otro sector
                </button>
                .
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addOwnTaskMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="own-repair-type">
                  Tipo de Reparacion <span className="text-destructive">*</span>
                </Label>
                {isLoadingSectorTypes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando tipos del sector...
                  </div>
                ) : (
                  <>
                    <Select value={ownRepairTypeId} onValueChange={handleOwnRepairTypeChange}>
                      <SelectTrigger
                        id="own-repair-type"
                        className={cn('h-11', ownErrors.repairType && 'border-destructive ring-destructive/20 ring-2')}
                      >
                        <SelectValue placeholder="Seleccionar tipo de reparacion" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectorRepairTypes.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            <div className="flex items-center gap-2">
                              {rt.name}
                              {rt.autorizable && (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                  Autorizable
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ownErrors.repairType && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {ownErrors.repairType}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="own-description">
                  Descripcion <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="own-description"
                  placeholder="Describa la tarea a realizar..."
                  value={ownDescription}
                  onChange={(e) => handleOwnDescriptionChange(e.target.value)}
                  rows={3}
                  className={cn(
                    'min-h-[80px]',
                    ownErrors.description && 'border-destructive ring-destructive/20 ring-2'
                  )}
                />
                {ownErrors.description && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {ownErrors.description}
                  </p>
                )}
              </div>

              {/* Info contextual segun tipo seleccionado */}
              {selectedOwnRepairType?.autorizable && (
                <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300 text-sm">Requiere aprobacion</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
                    Esta tarea sera enviada como solicitud al jefe de taller para su aprobacion antes de ejecutarse.
                  </AlertDescription>
                </Alert>
              )}

              {selectedOwnRepairType && !selectedOwnRepairType.autorizable && (
                <div className="flex items-start gap-2 rounded-md border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 px-3 py-2">
                  <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    La tarea se agregara directamente a esta orden de trabajo.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={addOwnTaskMutation.isPending}
                  className="h-11"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={addOwnTaskMutation.isPending || hasNoSectorRepairTypes}
                  className="h-11"
                >
                  {addOwnTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </form>
          )}
        </TabsContent>

        {/* ═══════════════════ Otro Sector ═══════════════════ */}
        <TabsContent value="other" className="space-y-4 pt-4">
          {!maintenanceOrderId ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No se pudo obtener la orden de mantenimiento asociada.</AlertDescription>
            </Alert>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addOtherTaskMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="other-repair-type">
                  Tipo de Reparacion <span className="text-destructive">*</span>
                </Label>
                {isLoadingAllTypes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando tipos disponibles...
                  </div>
                ) : (
                  <>
                    <Select value={otherRepairTypeId} onValueChange={handleOtherRepairTypeChange}>
                      <SelectTrigger
                        id="other-repair-type"
                        className={cn(
                          'h-11',
                          otherErrors.repairType && 'border-destructive ring-destructive/20 ring-2'
                        )}
                      >
                        <SelectValue placeholder="Seleccionar tipo de reparacion" />
                      </SelectTrigger>
                      <SelectContent>
                        {allRepairTypes.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {otherErrors.repairType && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {otherErrors.repairType}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="other-description">
                  Descripcion <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="other-description"
                  placeholder="Describa la tarea a realizar..."
                  value={otherDescription}
                  onChange={(e) => handleOtherDescriptionChange(e.target.value)}
                  rows={3}
                  className={cn(
                    'min-h-[80px]',
                    otherErrors.description && 'border-destructive ring-destructive/20 ring-2'
                  )}
                />
                {otherErrors.description && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {otherErrors.description}
                  </p>
                )}
              </div>

              {/* Resumen de derivacion */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Derivacion a otro sector</span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Esta tarea sera enviada al jefe de taller, quien decidira a que sector asignarla.
                </p>
                {selectedOtherRepairType && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Settings2 className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Tipo: <strong>{selectedOtherRepairType.name}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={addOtherTaskMutation.isPending}
                  className="h-11"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={addOtherTaskMutation.isPending} className="h-11">
                  {addOtherTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Solicitar
                </Button>
              </div>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
}
