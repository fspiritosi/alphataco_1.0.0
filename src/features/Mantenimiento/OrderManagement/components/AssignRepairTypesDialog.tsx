'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { toast } from 'sonner';
import type { OrderManagementItem } from '../actions/actionsServer';

type OrderItem = OrderManagementItem['maintenance_order_items'][number];

interface AssignRepairTypesDialogProps {
  item: OrderItem;
  repairTypes: Array<{ id: string; name: string }>;
  open: boolean;
  onClose: () => void;
  onUpdate: (itemId: string, repairTypeIds: string[]) => void;
}

export function AssignRepairTypesDialog({ item, repairTypes, open, onClose, onUpdate }: AssignRepairTypesDialogProps) {
  // Inicializar desde pivot (prioridad) o legacy
  const pivotTypes = item.maintenance_order_item_repair_types || [];
  const initialIds =
    pivotTypes.length > 0
      ? (pivotTypes.map((rt) => rt.repair_type_id).filter(Boolean) as string[])
      : item.repair_type_id
        ? [item.repair_type_id]
        : [];

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  const handleToggle = (repairTypeId: string) => {
    setSelectedIds((prev) =>
      prev.includes(repairTypeId) ? prev.filter((id) => id !== repairTypeId) : [...prev, repairTypeId]
    );
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast.error('Debe seleccionar al menos un tipo de reparacion');
      return;
    }

    onUpdate(item.id, selectedIds);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Tipos de Reparacion</DialogTitle>
          <DialogDescription>Seleccione las tareas a realizar para la resolucion del desvio</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {repairTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay tipos de reparacion disponibles</p>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-1">
                {repairTypes.map((repairType) => (
                  <div
                    key={repairType.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                    onClick={() => handleToggle(repairType.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(repairType.id)}
                      onCheckedChange={() => handleToggle(repairType.id)}
                    />
                    <span className="text-sm flex-1">{repairType.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedIds.map((id) => {
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
