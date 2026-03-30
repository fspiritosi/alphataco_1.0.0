'use client';

import { Filter } from 'lucide-react';

import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { supportsConditions, type ConditionsState } from '../config/documentConditions';
import { countActiveConditions } from '../utils/conditionsMapper';
import { _EmployeeConditions } from './_EmployeeConditions';
import { _EquipmentConditions } from './_EquipmentConditions';

// ============================================
// TIPOS
// ============================================

interface ConditionsSectionProps {
  /** Valor del enum document_applies: 'Persona' | 'Equipos' | 'Empresa' */
  applies: string;
  /** Si el documento es condicional (special) */
  isSpecial: boolean;
  /** Callback para cambiar isSpecial */
  onIsSpecialChange: (value: boolean) => void;
  /** Estado de condiciones */
  conditions: ConditionsState;
  /** Callback para cambiar condiciones (parcial) */
  onConditionsChange: (partial: Partial<ConditionsState>) => void;
  /** Deshabilitado */
  disabled?: boolean;
  /** Nombres resueltos para hidratar badges en modo edición */
  initialNamesMap?: Record<string, Map<string, string>>;
}

// ============================================
// COMPONENTE
// ============================================

export function _ConditionsSection({
  applies,
  isSpecial,
  onIsSpecialChange,
  conditions,
  onConditionsChange,
  disabled = false,
  initialNamesMap,
}: ConditionsSectionProps) {
  if (!supportsConditions(applies)) {
    return null;
  }

  const activeCount = isSpecial ? countActiveConditions(conditions) : 0;

  return (
    <div className="space-y-3">
      {/* Switch de activación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="is-special" className="font-medium">
            Documento condicional
          </Label>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeCount} condicion{activeCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <Switch id="is-special" checked={isSpecial} onCheckedChange={onIsSpecialChange} disabled={disabled} />
      </div>

      {/* Contenido colapsable */}
      <Collapsible open={isSpecial}>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <Card className="mt-2 border-dashed">
            <CardContent className="pt-4">
              <CardDescription className="mb-4">
                Este documento solo aplicará a {applies === 'Persona' ? 'empleados' : 'equipos'} que cumplan al menos
                una condición de cada grupo configurado. Los grupos vacíos no restringen.
              </CardDescription>

              {applies === 'Persona' && (
                <_EmployeeConditions
                  conditions={conditions}
                  onConditionsChange={onConditionsChange}
                  disabled={disabled}
                  initialNamesMap={initialNamesMap}
                />
              )}

              {applies === 'Equipos' && (
                <_EquipmentConditions
                  conditions={conditions}
                  onConditionsChange={onConditionsChange}
                  disabled={disabled}
                  initialNamesMap={initialNamesMap}
                />
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
