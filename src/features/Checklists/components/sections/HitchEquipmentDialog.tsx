'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Equipment } from '@/features/Checklists/lib/checklist-form-schema';
import { cn } from '@/lib/utils';
import { AlertCircle, Check } from 'lucide-react';

type HitchEquipmentDialogProps = {
  showHitchSelector: boolean;
  setShowHitchSelector: (open: boolean) => void;
  isLoadingHitchEquipment: boolean;
  compatibleHitchEquipment: Equipment[];
  selectedHitchEquipment: string | null;
  setSelectedHitchEquipment: (value: string | null) => void;
};

/**
 * Selector del equipo enganchado (COD-290): el checklist se guarda para la unidad tractora
 * y para el acoplado, cada uno con sus propios desvíos.
 */
export function HitchEquipmentDialog({
  showHitchSelector,
  setShowHitchSelector,
  isLoadingHitchEquipment,
  compatibleHitchEquipment,
  selectedHitchEquipment,
  setSelectedHitchEquipment,
}: HitchEquipmentDialogProps) {
  return (
    <Dialog open={showHitchSelector} onOpenChange={setShowHitchSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar Equipo Enganchado</DialogTitle>
            <DialogDescription>
              Seleccione el equipo que está enganchado al equipo UT seleccionado. El checklist se guardará para ambos
              equipos.
            </DialogDescription>
          </DialogHeader>

          {isLoadingHitchEquipment ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando equipos compatibles...</div>
            </div>
          ) : compatibleHitchEquipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-medium">No se encontraron equipos compatibles</p>
                <p className="text-sm text-muted-foreground">
                  El tipo de este equipo UT no tiene equipos compatibles configurados para enganche.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Command className="rounded-lg border">
                <CommandInput placeholder="Buscar equipo enganchado..." />
                <CommandList>
                  <CommandEmpty>No se encontraron equipos compatibles.</CommandEmpty>
                  <CommandGroup>
                    {compatibleHitchEquipment.map((equipment) => {
                      const isSelected = selectedHitchEquipment === equipment.value;
                      return (
                        <CommandItem
                          key={equipment.value}
                          value={equipment.label}
                          onSelect={() => {
                            setSelectedHitchEquipment(equipment.value);
                            setShowHitchSelector(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                          <div className="flex-1">
                            <div className="font-medium">{equipment.label}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {equipment.domain && (
                                <div className="text-sm text-muted-foreground">Dominio: {equipment.domain}</div>
                              )}
                              {equipment.sub_type_name && equipment.sub_type_name !== 'N/A' && (
                                <span className="rounded bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                                  {equipment.sub_type_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHitchSelector(false);
                  }}
                >
                  Cancelar
                </Button>
                {selectedHitchEquipment && (
                  <Button
                    onClick={() => {
                      setShowHitchSelector(false);
                    }}
                  >
                    Confirmar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
  );
}
