'use client';

import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronsUpDown, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useApproveMaintenanceRequestItems } from '../hooks/useMaintenanceRequests';

interface SolicitudApprovalDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

type Deviation = {
  id: string;
  itemId: string; // maintenance_request_item.id
  item_code: string;
  item_label: string;
  section_code: string | null;
  repair_type_id: string | null;
  repair_type_name: string | null;
};

type RepairGroup = {
  id: string;
  repair_type_id: string;
  selected_deviations: string[]; // deviation.id (checklist_deviation_id)
};

export function SolicitudApprovalDialog({ request, open, onClose }: SolicitudApprovalDialogProps) {
  // Extraer los desvíos con sus asignaciones de tipo de reparación
  const deviations: Deviation[] = useMemo(() => {
    return (
      request.maintenance_request_items?.map((item) => ({
        id: item.checklist_deviation_id,
        itemId: item.id,
        item_code: item.checklist_deviations?.item_code || '',
        item_label: item.checklist_deviations?.item_label || 'Sin título',
        section_code: item.checklist_deviations?.section_code || null,
        repair_type_id: item.repair_type_id || null,
        repair_type_name: item.types_of_repairs?.name || null,
      })) || []
    );
  }, [request.maintenance_request_items]);

  // Determinar si el chofer ya asignó tipos de reparación
  const hasDriverAssignments = useMemo(() => {
    return deviations.some((d) => d.repair_type_id !== null);
  }, [deviations]);

  // Estado de edición
  const [isEditing, setIsEditing] = useState(!hasDriverAssignments);

  // Agrupar desvíos por tipo de reparación (para modo precargado)
  const initialRepairGroups: RepairGroup[] = useMemo(() => {
    if (!hasDriverAssignments) return [];

    const groupMap = new Map<string, RepairGroup>();

    deviations.forEach((deviation) => {
      if (deviation.repair_type_id) {
        const existing = groupMap.get(deviation.repair_type_id);
        if (existing) {
          existing.selected_deviations.push(deviation.id);
        } else {
          groupMap.set(deviation.repair_type_id, {
            id: crypto.randomUUID(),
            repair_type_id: deviation.repair_type_id,
            selected_deviations: [deviation.id],
          });
        }
      }
    });

    return Array.from(groupMap.values());
  }, [deviations, hasDriverAssignments]);

  // Estado de los grupos de reparación (editables)
  const [repairGroups, setRepairGroups] = useState<RepairGroup[]>(initialRepairGroups);
  const [selectedDeviationIds, setSelectedDeviationIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    initialRepairGroups.forEach((group) => {
      group.selected_deviations.forEach((id) => initial.add(id));
    });
    return initial;
  });
  const [openRepairSelects, setOpenRepairSelects] = useState<Record<string, boolean>>({});

  // Estado para items rechazados
  const [rejectedItems, setRejectedItems] = useState<Record<string, string>>({});

  const { data: repairTypes } = useQuery({
    queryKey: ['types-of-repairs'],
    queryFn: fetchAllTypesOfRepairs,
  });

  const approveMutation = useApproveMaintenanceRequestItems();

  // Handlers para edición de grupos
  const handleAddRepairGroup = () => {
    const newGroup: RepairGroup = {
      id: crypto.randomUUID(),
      repair_type_id: '',
      selected_deviations: [],
    };
    setRepairGroups([...repairGroups, newGroup]);
  };

  const handleRemoveRepairGroup = (groupId: string) => {
    const group = repairGroups.find((g) => g.id === groupId);
    if (group) {
      const newSelected = new Set(selectedDeviationIds);
      group.selected_deviations.forEach((id) => newSelected.delete(id));
      setSelectedDeviationIds(newSelected);
    }
    setRepairGroups(repairGroups.filter((g) => g.id !== groupId));
    const newOpenSelects = { ...openRepairSelects };
    delete newOpenSelects[groupId];
    setOpenRepairSelects(newOpenSelects);
  };

  const handleSelectRepairType = (groupId: string, repairTypeId: string) => {
    setRepairGroups(repairGroups.map((g) => (g.id === groupId ? { ...g, repair_type_id: repairTypeId } : g)));
    setOpenRepairSelects({ ...openRepairSelects, [groupId]: false });
  };

  const handleToggleDeviation = (groupId: string, deviationId: string) => {
    const group = repairGroups.find((g) => g.id === groupId);
    if (!group) return;

    const newSelectedDeviations = group.selected_deviations.includes(deviationId)
      ? group.selected_deviations.filter((id) => id !== deviationId)
      : [...group.selected_deviations, deviationId];

    setRepairGroups(
      repairGroups.map((g) => (g.id === groupId ? { ...g, selected_deviations: newSelectedDeviations } : g))
    );

    const newSelected = new Set(selectedDeviationIds);
    if (newSelectedDeviations.includes(deviationId)) {
      newSelected.add(deviationId);
    } else {
      newSelected.delete(deviationId);
    }
    setSelectedDeviationIds(newSelected);
  };

  const handleRejectionReasonChange = (deviationId: string, reason: string) => {
    setRejectedItems((prev) => ({
      ...prev,
      [deviationId]: reason,
    }));
  };

  const getRepairTypeName = (repairTypeId: string) => {
    return repairTypes?.find((t) => t.id === repairTypeId)?.name || '';
  };

  // Items no asignados
  const unassignedDeviations = deviations.filter((d) => !selectedDeviationIds.has(d.id));

  const handleSubmit = async () => {
    // Construir items aprobados y rechazados
    const approvedItems: { itemId: string; repairTypeId?: string }[] = [];
    const rejectedItemsList: { itemId: string; reason: string }[] = [];

    // Items aprobados: los que están en algún grupo de reparación
    repairGroups.forEach((group) => {
      group.selected_deviations.forEach((deviationId) => {
        const deviation = deviations.find((d) => d.id === deviationId);
        if (deviation) {
          approvedItems.push({
            itemId: deviation.itemId,
            repairTypeId: group.repair_type_id || undefined,
          });
        }
      });
    });

    // Items rechazados: los que no están en ningún grupo
    unassignedDeviations.forEach((deviation) => {
      const reason = rejectedItems[deviation.id];
      if (!reason?.trim()) {
        toast.error(`Debe indicar un motivo de rechazo para: ${deviation.item_label}`);
        return;
      }
      rejectedItemsList.push({
        itemId: deviation.itemId,
        reason,
      });
    });

    // Validar que todos los items no asignados tengan motivo de rechazo
    const missingReasons = unassignedDeviations.filter((d) => !rejectedItems[d.id]?.trim());
    if (missingReasons.length > 0) {
      toast.error('Debe indicar un motivo de rechazo para todos los items no asignados');
      return;
    }

    // Validar que todos los grupos tengan tipo de reparación
    const invalidGroups = repairGroups.filter((g) => g.selected_deviations.length > 0 && !g.repair_type_id);
    if (invalidGroups.length > 0) {
      toast.error('Todos los grupos de reparación deben tener un tipo de reparación asignado');
      return;
    }

    try {
      await approveMutation.mutateAsync({
        requestId: request.id,
        approvedItems,
        rejectedItems: rejectedItemsList,
      });
      toast.success('Solicitud procesada exitosamente');
      onClose();
    } catch {
      toast.error('Error al procesar la solicitud');
    }
  };

  const selectedCount = selectedDeviationIds.size;
  const totalCount = deviations.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprobar Solicitud de Mantenimiento</DialogTitle>
          <DialogDescription>
            {hasDriverAssignments
              ? 'El chofer ya asignó los desvíos a tipos de reparación. Puede aprobar o editar las asignaciones.'
              : 'Asigne los desvíos a tipos de reparación para aprobar la solicitud.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del equipo */}
          <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
            <div>
              <span className="text-sm text-muted-foreground">Equipo: </span>
              <span className="font-medium">
                {request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar'}
              </span>
            </div>
            {hasDriverAssignments && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar asignaciones
              </Button>
            )}
          </div>

          {/* Lista de items críticos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items Críticos ({deviations.length})</CardTitle>
              <CardDescription>
                {unassignedDeviations.length > 0
                  ? `${unassignedDeviations.length} item(s) sin asignar (serán rechazados)`
                  : 'Todos los items están asignados a una reparación'}
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
                        isSelected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      )}
                    >
                      <AlertCircle
                        className={cn('h-5 w-5 shrink-0', isSelected ? 'text-green-600' : 'text-destructive')}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{deviation.item_label}</p>
                        {deviation.section_code && (
                          <p className="text-sm text-muted-foreground capitalize">
                            Sección: {deviation.section_code.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={isSelected ? 'default' : 'destructive'}>
                        {isSelected ? 'Asignado' : 'Sin asignar'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Grupos de reparación (editables o readonly) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tipos de Reparación</h3>
              {isEditing && (
                <Button onClick={handleAddRepairGroup} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Tipo
                </Button>
              )}
            </div>

            {repairGroups.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay tipos de reparación asignados. {isEditing && 'Agrega uno para comenzar.'}
                </CardContent>
              </Card>
            )}

            {repairGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {getRepairTypeName(group.repair_type_id) || 'Tipo de reparación sin asignar'}
                    </CardTitle>
                    {isEditing && (
                      <Button
                        onClick={() => handleRemoveRepairGroup(group.id)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Select de tipo de reparación */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label>Tipo de Reparación *</Label>
                      <Popover
                        open={openRepairSelects[group.id] || false}
                        onOpenChange={(open) => setOpenRepairSelects({ ...openRepairSelects, [group.id]: open })}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn('w-full justify-between', !group.repair_type_id && 'text-muted-foreground')}
                          >
                            {group.repair_type_id ? getRepairTypeName(group.repair_type_id) : 'Seleccionar tipo...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar tipo de reparación..." />
                            <CommandList>
                              <CommandEmpty>No se encontró ningún tipo de reparación.</CommandEmpty>
                              <CommandGroup>
                                {repairTypes?.map((repairType) => (
                                  <CommandItem
                                    key={repairType.id}
                                    value={repairType.name}
                                    onSelect={() => handleSelectRepairType(group.id, repairType.id)}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        group.repair_type_id === repairType.id ? 'opacity-100' : 'opacity-0'
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
                  ) : (
                    <div className="text-sm text-muted-foreground">Tipo asignado por el chofer</div>
                  )}

                  {/* Checkboxes de items asignados */}
                  <div className="space-y-2">
                    <Label>Items asignados a esta reparación</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {deviations.map((deviation) => {
                        const isChecked = group.selected_deviations.includes(deviation.id);
                        const isDisabledByOther =
                          !isChecked &&
                          selectedDeviationIds.has(deviation.id) &&
                          !group.selected_deviations.includes(deviation.id);

                        return (
                          <div key={deviation.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${group.id}-${deviation.id}`}
                              checked={isChecked}
                              disabled={!isEditing || isDisabledByOther}
                              onCheckedChange={() => handleToggleDeviation(group.id, deviation.id)}
                            />
                            <Label
                              htmlFor={`${group.id}-${deviation.id}`}
                              className={cn(
                                'text-sm font-normal cursor-pointer flex-1',
                                (!isEditing || isDisabledByOther) && 'text-muted-foreground cursor-not-allowed'
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Items sin asignar (serán rechazados) */}
          {unassignedDeviations.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg text-red-700">
                  Items que serán rechazados ({unassignedDeviations.length})
                </CardTitle>
                <CardDescription>
                  Estos items no están asignados a ningún tipo de reparación. Debe indicar un motivo de rechazo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {unassignedDeviations.map((deviation) => (
                  <div key={deviation.id} className="space-y-2 p-3 border border-red-200 rounded-lg bg-red-50/50">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{deviation.item_label}</span>
                    </div>
                    <Textarea
                      value={rejectedItems[deviation.id] || ''}
                      onChange={(e) => handleRejectionReasonChange(deviation.id, e.target.value)}
                      placeholder="Motivo del rechazo (requerido)..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Resumen */}
          <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
            <span className="text-sm">
              <span className="text-green-600 font-medium">{selectedCount}</span> aprobados,{' '}
              <span className="text-red-600 font-medium">{totalCount - selectedCount}</span> rechazados
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              approveMutation.isPending ||
              (repairGroups.length > 0 &&
                repairGroups.some((g) => !g.repair_type_id && g.selected_deviations.length > 0))
            }
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
