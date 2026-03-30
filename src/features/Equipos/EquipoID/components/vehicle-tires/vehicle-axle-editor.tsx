'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AxleInput as PlantillasAxleInput } from '@/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server';
import { AxleConfigurator } from '@/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator';
import { TireDiagramRenderer } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AxleInput } from './actions.server';
import { createVehicleCustomTemplate, updateVehicleCustomAxles } from './actions.server';

// ============================================================================
// TYPES
// ============================================================================

interface VehicleAxleEditorProps {
  vehicleId: string;
  currentAxles: AxleInput[];
  isNewConfig: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function toPlantillasAxle(a: AxleInput): PlantillasAxleInput {
  return {
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  };
}

function fromPlantillasAxle(a: PlantillasAxleInput): AxleInput {
  return {
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VehicleAxleEditor({
  vehicleId,
  currentAxles,
  isNewConfig,
  open,
  onOpenChange,
  onSave,
}: VehicleAxleEditorProps) {
  const [axles, setAxles] = useState<PlantillasAxleInput[]>(
    currentAxles.length > 0
      ? currentAxles.map(toPlantillasAxle)
      : [{ axle_number: 1, tires_per_side: 1, tire_size: '', is_drive_axle: false, is_spare: false }]
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset editor state when opening
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setAxles(
        currentAxles.length > 0
          ? currentAxles.map(toPlantillasAxle)
          : [{ axle_number: 1, tires_per_side: 1, tire_size: '', is_drive_axle: false, is_spare: false }]
      );
    }
    onOpenChange(nextOpen);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (axles.length === 0) return 'Debe configurar al menos un eje.';
    const missingSizes = axles.filter((a) => !a.tire_size.trim());
    if (missingSizes.length > 0) {
      return `Complete la medida de todos los ejes (faltan ${missingSizes.length}).`;
    }
    return null;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      const payload = axles.map(fromPlantillasAxle);

      if (isNewConfig) {
        await createVehicleCustomTemplate(vehicleId, payload);
        toast.success('Configuración creada correctamente');
      } else {
        await updateVehicleCustomAxles(vehicleId, payload);
        toast.success('Configuración actualizada correctamente');
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      toast.error(isNewConfig ? 'Error al crear la configuración' : 'Error al actualizar la configuración');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Preview diagram data ───────────────────────────────────────────────────

  const previewAxles = axles.map((a) => ({
    id: `preview-${a.axle_number}`,
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size || '(sin medida)',
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  }));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col gap-0 overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {isNewConfig ? 'Crear configuración de cubiertas' : 'Editar configuración de cubiertas'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6">
          {/* Axle configurator */}
          <AxleConfigurator value={axles} onChange={setAxles} />

          {/* Preview diagram */}
          {previewAxles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vista previa</p>
              <div className="rounded-lg border bg-muted/30 p-3">
                <TireDiagramRenderer axles={previewAxles} interactive={false} />
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isNewConfig ? 'Crear configuración' : 'Guardar cambios'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
