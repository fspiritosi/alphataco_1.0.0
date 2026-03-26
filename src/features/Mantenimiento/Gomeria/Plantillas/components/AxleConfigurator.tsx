'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, PlusCircle, Trash2 } from 'lucide-react';
import type { AxleInput } from '../actions/actions.server';

// ============================================================================
// TYPES
// ============================================================================

interface AxleConfiguratorProps {
  value: AxleInput[];
  onChange: (axles: AxleInput[]) => void;
}

// ============================================================================
// DEFAULTS
// ============================================================================

function createDefaultAxle(axleNumber: number, isSpare = false): AxleInput {
  return {
    axle_number: axleNumber,
    tires_per_side: isSpare ? 1 : 1,
    tire_size: '',
    is_drive_axle: false,
    is_spare: isSpare,
  };
}

function recalculateAxleNumbers(axles: AxleInput[]): AxleInput[] {
  return axles.map((axle, index) => ({
    ...axle,
    axle_number: index + 1,
  }));
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AxleConfigurator({ value: axles, onChange }: AxleConfiguratorProps) {
  function addAxle() {
    const newAxle = createDefaultAxle(axles.length + 1);
    onChange([...axles, newAxle]);
  }

  function addSpareAxle() {
    const newAxle = createDefaultAxle(axles.length + 1, true);
    onChange([...axles, newAxle]);
  }

  function removeAxle(index: number) {
    const updated = axles.filter((_, i) => i !== index);
    onChange(recalculateAxleNumbers(updated));
  }

  function updateAxle(index: number, changes: Partial<AxleInput>) {
    const updated = axles.map((axle, i) => {
      if (i !== index) return axle;
      const merged = { ...axle, ...changes };
      // If is_spare is checked: lock tires_per_side to 1, disable drive_axle
      if (merged.is_spare) {
        merged.tires_per_side = 1;
        merged.is_drive_axle = false;
      }
      return merged;
    });
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_1fr_auto_auto_2rem] gap-2 items-center text-xs font-medium text-muted-foreground pb-1 border-b">
        <span>Eje</span>
        <span>Tipo</span>
        <span>Medida</span>
        <span>Tractor</span>
        <span>Auxilio</span>
        <span />
      </div>

      {/* Axle rows */}
      {axles.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-2">No hay ejes configurados. Agregue al menos un eje.</p>
      )}

      {axles.map((axle, index) => (
        <div key={index} className="grid grid-cols-[2rem_1fr_1fr_auto_auto_2rem] gap-2 items-center">
          {/* Axle number (readonly) */}
          <div className="flex items-center justify-center">
            <span className="text-sm font-mono font-medium text-muted-foreground">{axle.axle_number}</span>
          </div>

          {/* tires_per_side */}
          <Select
            value={String(axle.tires_per_side)}
            onValueChange={(val) => updateAxle(index, { tires_per_side: Number(val) })}
            disabled={axle.is_spare}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Simple (1)</SelectItem>
              <SelectItem value="2">Dual (2)</SelectItem>
            </SelectContent>
          </Select>

          {/* tire_size */}
          <Input
            placeholder="Ej: 295/80R22.5"
            value={axle.tire_size}
            onChange={(e) => updateAxle(index, { tire_size: e.target.value })}
            className="h-8 text-xs"
          />

          {/* is_drive_axle */}
          <div className="flex items-center justify-center">
            <Checkbox
              checked={axle.is_drive_axle}
              onCheckedChange={(checked) => updateAxle(index, { is_drive_axle: Boolean(checked) })}
              disabled={axle.is_spare}
              id={`drive-${index}`}
            />
          </div>

          {/* is_spare */}
          <div className="flex items-center justify-center">
            <Checkbox
              checked={axle.is_spare}
              onCheckedChange={(checked) => updateAxle(index, { is_spare: Boolean(checked) })}
              id={`spare-${index}`}
            />
          </div>

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeAxle(index)}
            disabled={axles.length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {/* Legend for checkboxes */}
      {axles.length > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-input rounded-sm" />
            <span>Tractor = eje motriz</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-input rounded-sm" />
            <span>Auxilio = cubierta de auxilio (siempre simple)</span>
          </div>
        </div>
      )}

      {/* Add buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addAxle}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Agregar eje
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addSpareAxle}>
          <PlusCircle className="mr-2 h-3.5 w-3.5" />
          Agregar auxilio
        </Button>
      </div>
    </div>
  );
}
