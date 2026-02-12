'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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

  // Form state for "Mi Sector"
  const [ownRepairTypeId, setOwnRepairTypeId] = useState<string>('');
  const [ownDescription, setOwnDescription] = useState('');

  // Form state for "Otro Sector"
  const [otherRepairTypeId, setOtherRepairTypeId] = useState<string>('');
  const [otherDescription, setOtherDescription] = useState('');

  // Fetch sector-specific repair types
  const { data: sectorRepairTypes = [], isLoading: isLoadingSectorTypes } = useQuery({
    queryKey: ['operator-sector-repair-types', sectorId],
    queryFn: () => getRepairTypesForSector(sectorId),
    enabled: open && activeTab === 'own',
  });

  // Fetch all repair types
  const { data: allRepairTypes = [], isLoading: isLoadingAllTypes } = useQuery({
    queryKey: ['operator-all-repair-types'],
    queryFn: () => getAllRepairTypes(),
    enabled: open && activeTab === 'other' && !!maintenanceOrderId,
  });

  // Get selected repair type details for "Mi Sector"
  const selectedOwnRepairType = sectorRepairTypes.find((rt) => rt.id === ownRepairTypeId);

  // Mutation for "Mi Sector"
  const addOwnTaskMutation = useMutation({
    mutationFn: async () => {
      if (!ownRepairTypeId || !ownDescription.trim()) {
        throw new Error('Debe seleccionar un tipo de reparacion y agregar una descripcion');
      }

      const isAutorizable = selectedOwnRepairType?.autorizable || false;

      return addTaskToOwnWorkOrder(workOrderId, ownRepairTypeId, ownDescription.trim(), isAutorizable);
    },
    onSuccess: (result) => {
      if (result.requiresApproval) {
        toast.success('Solicitud enviada al jefe de taller');
      } else {
        toast.success('Tarea agregada');
      }

      queryClient.invalidateQueries({ queryKey: ['operator-work-order'] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });

      resetForm();
      onClose();
    },
    onError: (error) => {
      logger.error('Error adding task to own work order', { data: { error } });
      toast.error('Error al agregar la tarea');
    },
  });

  // Mutation for "Otro Sector"
  const addOtherTaskMutation = useMutation({
    mutationFn: async () => {
      if (!maintenanceOrderId) {
        throw new Error('No se pudo obtener la orden de mantenimiento');
      }

      if (!otherRepairTypeId || !otherDescription.trim()) {
        throw new Error('Debe seleccionar un tipo de reparacion y agregar una descripcion');
      }

      return requestTaskForOtherSector(maintenanceOrderId, otherRepairTypeId, otherDescription.trim());
    },
    onSuccess: () => {
      toast.success('Solicitud enviada al jefe de taller');

      queryClient.invalidateQueries({ queryKey: ['operator-work-order'] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });

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

  const handleOwnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOwnTaskMutation.mutate();
  };

  const handleOtherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOtherTaskMutation.mutate();
  };

  const handleClose = () => {
    if (addOwnTaskMutation.isPending || addOtherTaskMutation.isPending) {
      return;
    }
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Tarea</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'own' | 'other')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="own">Mi Sector</TabsTrigger>
            <TabsTrigger value="other" disabled={!maintenanceOrderId}>
              Otro Sector
            </TabsTrigger>
          </TabsList>

          {/* TAB: Mi Sector */}
          <TabsContent value="own" className="space-y-4 pt-4">
            <form onSubmit={handleOwnSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="own-repair-type">Tipo de Reparación</Label>
                {isLoadingSectorTypes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando tipos de reparación...
                  </div>
                ) : (
                  <Select value={ownRepairTypeId} onValueChange={setOwnRepairTypeId}>
                    <SelectTrigger id="own-repair-type">
                      <SelectValue placeholder="Seleccionar tipo de reparación" />
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
                <Label htmlFor="own-description">Descripción</Label>
                <Textarea
                  id="own-description"
                  placeholder="Describe la tarea a realizar..."
                  value={ownDescription}
                  onChange={(e) => setOwnDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {selectedOwnRepairType?.autorizable && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Esta tarea requiere aprobación del jefe de taller</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={addOwnTaskMutation.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addOwnTaskMutation.isPending}>
                  {addOwnTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB: Otro Sector */}
          <TabsContent value="other" className="space-y-4 pt-4">
            {!maintenanceOrderId ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No se pudo obtener la orden de mantenimiento asociada. Contacta al administrador.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleOtherSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="other-repair-type">Tipo de Reparación</Label>
                  {isLoadingAllTypes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando tipos de reparación...
                    </div>
                  ) : (
                    <Select value={otherRepairTypeId} onValueChange={setOtherRepairTypeId}>
                      <SelectTrigger id="other-repair-type">
                        <SelectValue placeholder="Buscar tipo de reparación" />
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
                  <Label htmlFor="other-description">Descripción</Label>
                  <Textarea
                    id="other-description"
                    placeholder="Describe la tarea a realizar..."
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Esta tarea será enviada al jefe de taller para asignación</AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={addOtherTaskMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addOtherTaskMutation.isPending}>
                    {addOtherTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Solicitar
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
