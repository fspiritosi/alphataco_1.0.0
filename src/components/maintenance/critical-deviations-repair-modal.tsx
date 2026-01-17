'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { assignRepairTypesToDeviations } from '@/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer';
import { cn } from '@/lib/utils';
import type { TypeOfRepair } from '@/types/types';
import { AlertCircle, Check, ChevronsUpDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type Deviation = {
  id: string;
  item_code: string;
  item_label: string;
  section_code: string | null;
  created_at: string;
};

type RepairRequest = {
  id: string;
  repair_type_id: string;
  selected_deviations: string[];
  description: string;
  images?: (string | null)[];
};

interface CriticalDeviationsRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  deviations: Deviation[];
  equipmentId: string;
  repairTypes: TypeOfRepair;
}

export function CriticalDeviationsRepairModal({
  isOpen,
  onClose,
  onComplete,
  deviations,
  equipmentId,
  repairTypes,
}: CriticalDeviationsRepairModalProps) {
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [selectedDeviationIds, setSelectedDeviationIds] = useState<Set<string>>(new Set());
  const [openRepairSelects, setOpenRepairSelects] = useState<Record<string, boolean>>({});

  const handleAddRepairRequest = () => {
    const newRequest: RepairRequest = {
      id: crypto.randomUUID(),
      repair_type_id: '',
      selected_deviations: [],
      description: '',
    };
    setRepairRequests([...repairRequests, newRequest]);
  };

  const handleRemoveRepairRequest = (requestId: string) => {
    const request = repairRequests.find((r) => r.id === requestId);
    if (request) {
      // Liberar los desvíos seleccionados
      const newSelected = new Set(selectedDeviationIds);
      request.selected_deviations.forEach((id) => newSelected.delete(id));
      setSelectedDeviationIds(newSelected);
    }
    setRepairRequests(repairRequests.filter((r) => r.id !== requestId));
    const newOpenSelects = { ...openRepairSelects };
    delete newOpenSelects[requestId];
    setOpenRepairSelects(newOpenSelects);
  };

  const handleSelectRepairType = (requestId: string, repairTypeId: string) => {
    setRepairRequests(repairRequests.map((r) => (r.id === requestId ? { ...r, repair_type_id: repairTypeId } : r)));
    setOpenRepairSelects({ ...openRepairSelects, [requestId]: false });
  };

  const handleToggleDeviation = (requestId: string, deviationId: string) => {
    const request = repairRequests.find((r) => r.id === requestId);
    if (!request) return;

    const newSelectedDeviations = request.selected_deviations.includes(deviationId)
      ? request.selected_deviations.filter((id) => id !== deviationId)
      : [...request.selected_deviations, deviationId];

    setRepairRequests(
      repairRequests.map((r) => (r.id === requestId ? { ...r, selected_deviations: newSelectedDeviations } : r))
    );

    // Actualizar el set global de desvíos seleccionados
    const newSelected = new Set(selectedDeviationIds);
    if (newSelectedDeviations.includes(deviationId)) {
      newSelected.add(deviationId);
    } else {
      newSelected.delete(deviationId);
    }
    setSelectedDeviationIds(newSelected);
  };

  const handleUpdateDescription = (requestId: string, description: string) => {
    setRepairRequests(repairRequests.map((r) => (r.id === requestId ? { ...r, description } : r)));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (repairRequests.length === 0) {
      toast.error('Debes agregar al menos una solicitud de reparación');
      return;
    }

    const allDeviationsSelected = deviations.every((d) => selectedDeviationIds.has(d.id));
    if (!allDeviationsSelected) {
      toast.error('Todos los items críticos deben estar asignados a una solicitud de reparación');
      return;
    }

    const allRequestsValid = repairRequests.every((r) => r.repair_type_id && r.selected_deviations.length > 0);
    if (!allRequestsValid) {
      toast.error('Todas las solicitudes deben tener un tipo de reparación y al menos un item asignado');
      return;
    }

    try {
      // Construir las asignaciones: cada desvío con su tipo de reparación
      const assignments: Array<{ deviationId: string; repairTypeId: string }> = [];

      for (const request of repairRequests) {
        for (const deviationId of request.selected_deviations) {
          assignments.push({
            deviationId,
            repairTypeId: request.repair_type_id,
          });
        }
      }

      const result = await assignRepairTypesToDeviations({
        equipmentId,
        assignments,
      });

      if (result.ok) {
        toast.success('Tipos de reparación asignados exitosamente');
        onComplete();
        handleClose();
      } else {
        toast.error(result.error || 'Error al asignar los tipos de reparación');
      }
    } catch (error) {
      console.error('Error assigning repair types:', error);
      toast.error('Ocurrió un error al asignar los tipos de reparación');
    }
  };

  const handleClose = () => {
    setRepairRequests([]);
    setSelectedDeviationIds(new Set());
    setOpenRepairSelects({});
    onClose();
  };

  const getRepairTypeName = (repairTypeId: string) => {
    return repairTypes.find((t) => t.id === repairTypeId)?.name || '';
  };

  const unselectedDeviations = deviations.filter((d) => !selectedDeviationIds.has(d.id));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar Solicitudes de Reparación</DialogTitle>
          <DialogDescription>
            Asigna los items críticos fallidos a solicitudes de reparación. Todos los items deben estar asignados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de items críticos fallidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items Críticos Fallidos ({deviations.length})</CardTitle>
              <CardDescription>
                {unselectedDeviations.length > 0
                  ? `${unselectedDeviations.length} item(s) sin asignar`
                  : 'Todos los items están asignados'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deviations.map((deviation) => {
                  const isSelected = selectedDeviationIds.has(deviation.id);
                  return (
                    <div
                      key={deviation.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border',
                        isSelected ? 'bg-muted border-primary' : 'bg-background'
                      )}
                    >
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{deviation.item_label}</p>
                        {deviation.section_code && (
                          <p className="text-sm text-muted-foreground capitalize">
                            Sección: {deviation.section_code.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={isSelected ? 'default' : 'outline'}>
                        {isSelected ? 'Asignado' : 'Pendiente'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Solicitudes de reparación */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Solicitudes de Reparación</h3>
              <Button onClick={handleAddRepairRequest} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Solicitud
              </Button>
            </div>

            {repairRequests.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay solicitudes de reparación. Agrega una para comenzar.
                </CardContent>
              </Card>
            )}

            {repairRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Solicitud {repairRequests.indexOf(request) + 1}</CardTitle>
                    <Button
                      onClick={() => handleRemoveRepairRequest(request.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Select de tipo de reparación */}
                  <div className="space-y-2">
                    <Label>Tipo de Reparación *</Label>
                    <Popover
                      open={openRepairSelects[request.id] || false}
                      onOpenChange={(open) => setOpenRepairSelects({ ...openRepairSelects, [request.id]: open })}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn('w-full justify-between', !request.repair_type_id && 'text-muted-foreground')}
                        >
                          {request.repair_type_id ? getRepairTypeName(request.repair_type_id) : 'Seleccionar tipo...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar tipo de reparación..." />
                          <CommandList>
                            <CommandEmpty>No se encontró ningún tipo de reparación.</CommandEmpty>
                            <CommandGroup>
                              {repairTypes.map((repairType) => (
                                <CommandItem
                                  key={repairType.id}
                                  value={repairType.name}
                                  onSelect={() => handleSelectRepairType(request.id, repairType.id)}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      request.repair_type_id === repairType.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {repairType.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Checkboxes de items a resolver */}
                  <div className="space-y-2">
                    <Label>Items que se resolverán con esta reparación *</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {deviations.map((deviation) => {
                        const isChecked = request.selected_deviations.includes(deviation.id);
                        const isDisabled =
                          !isChecked &&
                          selectedDeviationIds.has(deviation.id) &&
                          !request.selected_deviations.includes(deviation.id);

                        return (
                          <div key={deviation.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${request.id}-${deviation.id}`}
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={() => handleToggleDeviation(request.id, deviation.id)}
                            />
                            <Label
                              htmlFor={`${request.id}-${deviation.id}`}
                              className={cn(
                                'text-sm font-normal cursor-pointer flex-1',
                                isDisabled && 'text-muted-foreground cursor-not-allowed'
                              )}
                            >
                              {deviation.item_label}
                              {deviation.section_code && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({deviation.section_code.replace('_', ' ')})
                                </span>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    {request.selected_deviations.length === 0 && (
                      <p className="text-sm text-destructive">Debes seleccionar al menos un item</p>
                    )}
                  </div>

                  {/* Descripción opcional */}
                  <div className="space-y-2">
                    <Label>Descripción (opcional)</Label>
                    <Textarea
                      placeholder="Describe el problema o detalles adicionales..."
                      value={request.description}
                      onChange={(e) => handleUpdateDescription(request.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} variant="outline">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                repairRequests.length === 0 ||
                unselectedDeviations.length > 0 ||
                repairRequests.some((r) => !r.repair_type_id || r.selected_deviations.length === 0)
              }
            >
              Generar Solicitudes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
