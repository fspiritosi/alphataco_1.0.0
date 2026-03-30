'use client';

import { _EnumMultiSelect } from '@/shared/components/common/_EnumMultiSelect';
import { _MultiSelectField } from '@/shared/components/common/_MultiSelectField';
import type { CatalogKey } from '../actions/actions.server';
import { searchCatalogForConditions } from '../actions/actions.server';
import {
  EMPLOYEE_CONDITIONS,
  getEnumConditions,
  getRelationConditions,
  type ConditionsState,
} from '../config/documentConditions';

// ============================================
// TIPOS
// ============================================

interface EmployeeConditionsProps {
  conditions: ConditionsState;
  onConditionsChange: (partial: Partial<ConditionsState>) => void;
  disabled?: boolean;
  initialNamesMap?: Record<string, Map<string, string>>;
}

// ============================================
// CONSTANTES DERIVADAS
// ============================================

const RELATION_CONDITIONS = getRelationConditions(EMPLOYEE_CONDITIONS);
const ENUM_CONDITIONS = getEnumConditions(EMPLOYEE_CONDITIONS);

// ============================================
// COMPONENTE
// ============================================

export function _EmployeeConditions({
  conditions,
  onConditionsChange,
  disabled = false,
  initialNamesMap,
}: EmployeeConditionsProps) {
  return (
    <div className="space-y-6">
      {/* Relaciones FK y M:M — Grid de 2 columnas */}
      {RELATION_CONDITIONS.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Relaciones</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {RELATION_CONDITIONS.map((config) => (
              <_MultiSelectField
                key={config.key}
                label={config.label}
                icon={config.icon}
                placeholder={`Buscar ${config.label.toLowerCase()}...`}
                searchFn={(query) => searchCatalogForConditions(config.catalogTable as CatalogKey, query)}
                queryKey={['doc-type-condition', 'employee', config.key]}
                selected={conditions[config.key] ?? []}
                onChange={(ids) => onConditionsChange({ [config.key]: ids })}
                disabled={disabled}
                initialOptionsMap={initialNamesMap?.[config.key]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enums — Grid de 2 columnas */}
      {ENUM_CONDITIONS.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Propiedades</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ENUM_CONDITIONS.map((config) => (
              <_EnumMultiSelect
                key={config.key}
                label={config.label}
                icon={config.icon}
                options={config.enumOptions ?? []}
                selected={conditions[config.key] ?? []}
                onChange={(values) => onConditionsChange({ [config.key]: values })}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
