'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AxleInput as PlantillasAxleInput } from '@/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server';
import { AxleConfigurator } from '@/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator';
import { TireDiagramRenderer } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import { calculatePositions, type DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DisplacedTiresDialog, type DisplacedTireInfo } from './DisplacedTiresDialog';
import type { AxleInput, DisplacedTireAction } from './actions.server';
import { createVehicleCustomTemplate, updateVehicleCustomAxles } from './actions.server';

// ============================================================================
// TYPES
// ============================================================================

export interface TirePositionSummary {
  position_number: number;
  tire_id: string | null;
  tire_serial?: string;
  tire_brand?: string;
}

interface VehicleAxleEditorProps {
  vehicleId: string;
  currentAxles: AxleInput[];
  currentPositions: TirePositionSummary[];
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
  currentPositions,
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
  const [displacedTires, setDisplacedTires] = useState<DisplacedTireInfo[]>([]);
  const [showDisplacedDialog, setShowDisplacedDialog] = useState(false);

  // Sync axles state when the sheet opens (Radix doesn't call onOpenChange for programmatic open)
  useEffect(() => {
    if (open) {
      setAxles(
        currentAxles.length > 0
          ? currentAxles.map(toPlantillasAxle)
          : [{ axle_number: 1, tires_per_side: 1, tire_size: '', is_drive_axle: false, is_spare: false }]
      );
    }
  }, [open, currentAxles]);

  function handleOpenChange(nextOpen: boolean) {
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

  // ── Displacement computation ───────────────────────────────────────────────

  function computeDisplacedTires(): DisplacedTireInfo[] {
    const oldDiagramAxles: DiagramAxle[] = currentAxles.map((a, i) => ({
      id: `old-${i}`,
      axle_number: a.axle_number,
      tires_per_side: a.tires_per_side,
      tire_size: a.tire_size,
      is_drive_axle: a.is_drive_axle,
      is_spare: a.is_spare,
    }));

    const newDiagramAxles: DiagramAxle[] = axles.map((a, i) => ({
      id: `new-${i}`,
      axle_number: a.axle_number,
      tires_per_side: a.tires_per_side,
      tire_size: a.tire_size,
      is_drive_axle: a.is_drive_axle,
      is_spare: a.is_spare,
    }));

    // oldDiagramAxles used only to make the logic explicit — new positions are what matter
    void oldDiagramAxles;

    const newPositions = calculatePositions(newDiagramAxles);
    const newPositionNumbers = new Set(newPositions.map((p) => p.position_number));

    return currentPositions
      .filter((p) => p.tire_id && !newPositionNumbers.has(p.position_number))
      .map((p) => ({
        tireId: p.tire_id!,
        serial: p.tire_serial ?? 'Sin serial',
        brand: p.tire_brand ?? null,
        positionNumber: p.position_number,
      }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(displacedTireActions: DisplacedTireAction[] = []) {
    setIsSaving(true);
    try {
      const payload = axles.map(fromPlantillasAxle);

      if (isNewConfig) {
        await createVehicleCustomTemplate(vehicleId, payload, displacedTireActions);
        toast.success('Configuración creada correctamente');
      } else {
        await updateVehicleCustomAxles(vehicleId, payload, displacedTireActions);
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

  function handleSaveClick() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    const displaced = computeDisplacedTires();
    if (displaced.length > 0) {
      setDisplacedTires(displaced);
      setShowDisplacedDialog(true);
    } else {
      void handleSave();
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
    <>
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
            <Button onClick={handleSaveClick} disabled={isSaving}>
              {isSaving ? 'Guardando...' : isNewConfig ? 'Crear configuración' : 'Guardar cambios'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DisplacedTiresDialog
        open={showDisplacedDialog}
        tires={displacedTires}
        onConfirm={(actions) => {
          setShowDisplacedDialog(false);
          void handleSave(actions);
        }}
        onCancel={() => setShowDisplacedDialog(false)}
      />
    </>
  );
}
