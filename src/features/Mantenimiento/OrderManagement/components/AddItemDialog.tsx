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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  repairTypes: Array<{ id: string; name: string }>;
  onAdd: (description: string, repairTypeIds: string[]) => void;
}

export function AddItemDialog({ open, onClose, repairTypes, onAdd }: AddItemDialogProps) {
  const [description, setDescription] = useState('');
  const [selectedRepairTypeIds, setSelectedRepairTypeIds] = useState<string[]>([]);

  const handleToggleRepairType = (repairTypeId: string) => {
    setSelectedRepairTypeIds((prev) =>
      prev.includes(repairTypeId) ? prev.filter((id) => id !== repairTypeId) : [...prev, repairTypeId]
    );
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error('La descripción es requerida');
      return;
    }

    onAdd(description.trim(), selectedRepairTypeIds);
    handleClose();
  };

  const handleClose = () => {
    setDescription('');
    setSelectedRepairTypeIds([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Reparación</DialogTitle>
          <DialogDescription>Agregar una reparación extra a la orden de mantenimiento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descripción *</Label>
            <Textarea
              placeholder="Descripción de la reparación"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipos de reparacion</Label>
            <p className="text-xs text-muted-foreground">Seleccione las tareas a realizar (opcional)</p>
            {repairTypes.length > 0 ? (
              <ScrollArea className="h-[160px] border rounded-md p-2">
                <div className="space-y-1">
                  {repairTypes.map((repairType) => (
                    <div
                      key={repairType.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => handleToggleRepairType(repairType.id)}
                    >
                      <Checkbox
                        checked={selectedRepairTypeIds.includes(repairType.id)}
                        onCheckedChange={() => handleToggleRepairType(repairType.id)}
                      />
                      <span className="text-sm flex-1">{repairType.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">No hay tipos de reparacion disponibles</p>
            )}
            {selectedRepairTypeIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
