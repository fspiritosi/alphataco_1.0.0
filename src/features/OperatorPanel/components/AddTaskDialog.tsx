'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  addTaskToOwnWorkOrder,
  getAllRepairTypes,
  getRepairTypesForSector,
  requestTaskForOtherSector,
} from '../actions/actionsServer';

const logger = new Logger('AddTaskDialog');

interface AddTaskDialogProps {
  workOrderId: string;
  maintenanceOrderId: string | null;
  open: boolean;
  onClose: () => void;
}

export function AddTaskDialog({ workOrderId, maintenanceOrderId, open, onClose }: AddTaskDialogProps) {
  const queryClient = useQueryClient();
  const { sectorId } = useOperatorContext();

  const [activeTab, setActiveTab] = useState<'own' | 'other'>('own');
  const [ownRepairTypeId, setOwnRepairTypeId] = useState<string>('');
  const [ownDescription, setOwnDescription] = useState('');
  const [otherRepairTypeId, setOtherRepairTypeId] = useState<string>('');
  const [otherDescription, setOtherDescription] = useState('');

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

  const addOwnTaskMutation = useMutation({
    mutationFn: async () => {
      if (!ownRepairTypeId || !ownDescription.trim()) {
        throw new Error('Debe seleccionar un tipo de reparacion y agregar una descripcion');
      }
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
      logger.error('Error adding task to own work order', { data: { error } });
      toast.error('Error al agregar la tarea');
    },
  });

  const addOtherTaskMutation = useMutation({
    mutationFn: async () => {
      if (!maintenanceOrderId) throw new Error('No se pudo obtener la orden de mantenimiento');
      if (!otherRepairTypeId || !otherDescription.trim()) {
        throw new Error('Debe seleccionar un tipo de reparacion y agregar una descripcion');
      }
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
      logger.error('Error requesting task for other sector', { data: { error } });
      toast.error('Error al enviar la solicitud');
    },
  });

  const resetForm = () => {
    setOwnRepairTypeId('');
    setOwnDescription('');
    setOtherRepairTypeId('');
    setOtherDescription('');
    setActiveTab('own');
  };

  const handleClose = () => {
    if (addOwnTaskMutation.isPending || addOtherTaskMutation.isPending) return;
    resetForm();
    onClose();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose} title="Agregar Tarea">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'own' | 'other')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="own">Mi Sector</TabsTrigger>
          <TabsTrigger value="other" disabled={!maintenanceOrderId}>
            Otro Sector
          </TabsTrigger>
        </TabsList>

        {/* Mi Sector */}
        <TabsContent value="own" className="space-y-4 pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addOwnTaskMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="own-repair-type">Tipo de Reparacion</Label>
              {isLoadingSectorTypes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando...
                </div>
              ) : (
                <Select value={ownRepairTypeId} onValueChange={setOwnRepairTypeId}>
                  <SelectTrigger id="own-repair-type" className="h-11">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorRepairTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="own-description">Descripcion</Label>
              <Textarea
                id="own-description"
                placeholder="Describe la tarea a realizar..."
                value={ownDescription}
                onChange={(e) => setOwnDescription(e.target.value)}
                rows={4}
                className="min-h-[100px]"
              />
            </div>

            {selectedOwnRepairType?.autorizable && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Esta tarea requiere aprobacion del jefe de taller</AlertDescription>
              </Alert>
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
              <Button type="submit" disabled={addOwnTaskMutation.isPending} className="h-11">
                {addOwnTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Otro Sector */}
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
                <Label htmlFor="other-repair-type">Tipo de Reparacion</Label>
                {isLoadingAllTypes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </div>
                ) : (
                  <Select value={otherRepairTypeId} onValueChange={setOtherRepairTypeId}>
                    <SelectTrigger id="other-repair-type" className="h-11">
                      <SelectValue placeholder="Buscar tipo de reparacion" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRepairTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="other-description">Descripcion</Label>
                <Textarea
                  id="other-description"
                  placeholder="Describe la tarea a realizar..."
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Esta tarea sera enviada al jefe de taller para asignacion</AlertDescription>
              </Alert>

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
