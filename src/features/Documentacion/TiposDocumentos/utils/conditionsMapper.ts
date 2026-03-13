import type { Prisma } from '@/generated/prisma/client';
import { findConfigByPropertyKey, getConditionsForAppliesTo, type ConditionsState } from '../config/documentConditions';

type JsonValue = Prisma.JsonValue;

// ============================================
// TIPO DEL JSON QUE ESPERAN LOS TRIGGERS SQL
// ============================================

interface ConditionJson {
  property_key: string;
  values: string[];
  reference_values: string[];
  ids: string[];
  is_relation: boolean;
  is_array_relation: boolean;
  relation_type: string;
  relation_table: string | null;
  column_on_employees?: string | null;
  column_on_vehicles?: string | null;
  column_on_relation: string | null;
  filter_column: string;
  property_label: string;
}

// ============================================
// SELECTIONS → JSON (para guardar en BD)
// ============================================

/**
 * Convierte las selecciones del formulario al array JSON que esperan los triggers SQL.
 *
 * @param selections - Estado de condiciones del form (key → array de IDs/valores)
 * @param applies - Valor del enum document_applies ('Persona' | 'Equipos')
 * @param namesMap - Mapa de nombres resueltos por config key (key → Map<id, name>)
 * @returns Array de objetos JSON para el campo conditions de document_types
 */
export function selectionsToConditionsJson(
  selections: ConditionsState,
  applies: string,
  namesMap: Record<string, Map<string, string>>
): JsonValue[] {
  const configs = getConditionsForAppliesTo(applies);
  const result: ConditionJson[] = [];

  for (const config of configs) {
    const selectedIds = selections[config.key];
    if (!selectedIds || selectedIds.length === 0) continue;

    const nameMap = namesMap[config.key];
    const resolvedValues = selectedIds.map((id) => nameMap?.get(id) ?? id);

    const isRelation = config.type === 'relation' || config.type === 'many_to_many';
    const isArrayRelation = config.type === 'many_to_many';

    const condition: ConditionJson = {
      property_key: config.propertyKey,
      values: resolvedValues,
      reference_values: [],
      ids: selectedIds,
      is_relation: isRelation,
      is_array_relation: isArrayRelation,
      relation_type: config.relationType,
      relation_table: config.relationTable,
      column_on_relation: config.columnOnRelation,
      filter_column: config.filterColumn,
      property_label: config.label,
    };

    // Elegir el campo correcto según el tipo de entidad
    if (applies === 'Persona') {
      condition.column_on_employees = config.columnOnEntity;
    } else if (applies === 'Equipos') {
      condition.column_on_vehicles = config.columnOnEntity;
    }

    result.push(condition);
  }

  return result as unknown as JsonValue[];
}

// ============================================
// JSON → SELECTIONS (para hidratar el form al editar)
// ============================================

interface ParsedConditions {
  /** Estado de selections para el form */
  selections: ConditionsState;
  /** Nombres resueltos por config key (key → Map<id, name>) para hidratar badges */
  namesMap: Record<string, Map<string, string>>;
}

/**
 * Convierte el JSON guardado en BD de vuelta a la estructura de selections
 * para hidratar los MultiSelects al editar un tipo de documento.
 *
 * @param conditions - Campo conditions de document_types (Json[])
 * @returns selections y namesMap para el formulario
 */
export function conditionsJsonToSelections(conditions: JsonValue[]): ParsedConditions {
  const selections: ConditionsState = {};
  const namesMap: Record<string, Map<string, string>> = {};

  if (!conditions || !Array.isArray(conditions)) {
    return { selections, namesMap };
  }

  for (const raw of conditions) {
    if (!raw || typeof raw !== 'object') continue;

    const json = raw as Record<string, unknown>;
    const propertyKey = json.property_key as string;
    if (!propertyKey) continue;

    const config = findConfigByPropertyKey(propertyKey);
    if (!config) continue;

    const ids = (json.ids as string[]) || [];
    const values = (json.values as string[]) || [];

    selections[config.key] = ids;

    // Construir namesMap para hidratar badges sin re-fetch
    const nameMap = new Map<string, string>();
    for (let i = 0; i < ids.length; i++) {
      nameMap.set(ids[i], values[i] ?? ids[i]);
    }
    namesMap[config.key] = nameMap;
  }

  return { selections, namesMap };
}

// ============================================
// HELPERS
// ============================================

/**
 * Verifica si hay al menos una condición activa (con selecciones)
 */
export function hasActiveConditions(conditions: ConditionsState): boolean {
  return Object.values(conditions).some((arr) => arr.length > 0);
}

/**
 * Cuenta el total de condiciones activas (para el badge del panel)
 */
export function countActiveConditions(conditions: ConditionsState): number {
  return Object.values(conditions).reduce((sum, arr) => sum + arr.length, 0);
}

/**
 * Combina un estado parcial de condiciones con el estado actual
 */
export function mergeConditions(current: ConditionsState, partial: Partial<ConditionsState>): ConditionsState {
  const merged: Record<string, string[]> = { ...current };
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}
